import { sql } from "drizzle-orm";
import { db } from "../worker-db";
import { popularityCycles, popularitySnapshots, scanRuns, scanTasks, games } from "../schema";
import { desc, eq, and, sql as dSql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Creates a new 4-day cycle and partitions the top 10k games into 4 parts.
 */
export async function createPopularityCycle() {
  const cycleId = crypto.randomUUID();
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000); // +4 days

  await db.insert(popularityCycles).values({
    id: cycleId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: 'READY',
    totalGames: 10000,
  });

  let topGames = await db.select({ id: games.id, appId: games.appId })
    .from(games)
    .where(and(eq(games.isTracked, true), eq(games.isAvailable, true)))
    .orderBy(desc(games.id))
    .limit(10000);

  // If DB is completely empty (first run), fetch seed from Steam
  if (topGames.length === 0) {
    console.log("⚠️ Database games table is empty! Bootstrapping top 10,000 games from Steam API...");
    const TOP_POPULAR_APP_IDS = [
      730, 570, 271590, 1091500, 1245620, 2357570, 413150, 105600, 588650, 367520,
      1145360, 504230, 268910, 292030, 550, 322330, 814380, 1174180, 1426210, 374320,
      1868140, 646570, 1794680, 632360, 108600, 227300, 378649, 1206340, 31280, 1030300
    ];
    const seen = new Set<number>();
    const resultAppIds: number[] = [];

    const add = (id: number) => {
      if (id && !seen.has(id)) {
        seen.add(id);
        resultAppIds.push(id);
      }
    };
    TOP_POPULAR_APP_IDS.forEach(add);

    try {
      const specRes = await fetch("https://store.steampowered.com/api/featuredcategories/?cc=VN&l=vietnamese", {
        headers: { "User-Agent": "SteamPriceVN/1.0" }
      });
      if (specRes.ok) {
        const specData = await specRes.json();
        const featuredItems = [
          ...(specData?.specials?.items || []),
          ...(specData?.top_sellers?.items || []),
          ...(specData?.new_releases?.items || []),
        ];
        featuredItems.forEach((item: any) => {
          if (item?.id) add(Number(item.id));
        });
      }
    } catch (e) {}

    const SEARCH_KEYWORDS = [];
    for (let i = 97; i <= 122; i++) SEARCH_KEYWORDS.push(String.fromCharCode(i));
    for (let i = 0; i <= 9; i++) SEARCH_KEYWORDS.push(String(i));

    for (const keyword of SEARCH_KEYWORDS) {
      if (resultAppIds.length >= 10000) break;
      try {
        const searchRes = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(keyword)}&cc=VN&l=vietnamese&start=0&count=50`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          (searchData?.items || []).forEach((item: any) => {
            if (item?.id) add(Number(item.id));
          });
        }
      } catch (e) {}
    }

    // Seed dummy games so they can be referenced
    topGames = resultAppIds.slice(0, 10000).map(appId => ({
      id: `game_${appId}`,
      appId: appId
    }));

    console.log(`✅ Bootstrapped ${topGames.length} candidate games. Inserting into DB to satisfy foreign keys...`);
    const gameChunkSize = 1000;
    for (let i = 0; i < topGames.length; i += gameChunkSize) {
      const chunk = topGames.slice(i, i + gameChunkSize).map(g => ({
        id: g.id,
        appId: g.appId,
        name: `App ${g.appId}`,
        slug: `app-${g.appId}`,
      }));
      if (chunk.length > 0) {
        await db.insert(games).values(chunk).onConflictDoNothing();
      }
    }
  }

  const snapshotValues = topGames.map((g, index) => {
    const rank = index + 1;
    let part = 1;
    if (rank > 2500 && rank <= 5000) part = 2;
    else if (rank > 5000 && rank <= 7500) part = 3;
    else if (rank > 7500) part = 4;

    return {
      id: crypto.randomUUID(),
      cycleId,
      gameId: g.id,
      popularityRank: rank,
      part
    };
  });

  // Chunk inserts to avoid query limits
  const chunkSize = 1000;
  for (let i = 0; i < snapshotValues.length; i += chunkSize) {
    const chunk = snapshotValues.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await db.insert(popularitySnapshots).values(chunk);
    }
  }

  return cycleId;
}

export async function createScanRunAndTasks(cycleId: string, part: number) {
  const runId = crypto.randomUUID();
  
  // Find target count
  const targetGames = await db.select()
    .from(popularitySnapshots)
    .where(and(eq(popularitySnapshots.cycleId, cycleId), eq(popularitySnapshots.part, part)));

  await db.insert(scanRuns).values({
    id: runId,
    cycleId,
    part,
    status: 'PENDING',
    targetCount: targetGames.length,
    startedAt: new Date().toISOString(),
  });

  // Create tasks
  const taskValues = targetGames.map(g => ({
    id: crypto.randomUUID(),
    runId,
    gameId: g.gameId,
    status: 'PENDING'
  }));

  const chunkSize = 1000;
  for (let i = 0; i < taskValues.length; i += chunkSize) {
    const chunk = taskValues.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await db.insert(scanTasks).values(chunk);
    }
  }

  return runId;
}
