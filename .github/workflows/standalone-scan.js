import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL secret!");
  process.exit(1);
}

const sql = neon(dbUrl);

// Top 50 Seed App IDs of most popular games on Steam
const TOP_POPULAR_APP_IDS = [
  730, 570, 271590, 1091500, 1245620, 2357570, 413150, 105600, 588650, 367520,
  1145360, 504230, 268910, 292030, 550, 322330, 814380, 1174180, 1426210, 374320,
  1868140, 646570, 1794680, 632360, 108600, 227300, 378649, 1206340, 31280, 1030300,
  1172470, 252490, 359550, 1086940, 1172620, 1599340, 1938090, 548430, 1085660, 1623730
];

async function ensureTables() {
  console.log("🛠 Verifying/Creating PostgreSQL tables in Neon...");

  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      app_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      slug TEXT,
      type TEXT DEFAULT 'game',
      short_description TEXT,
      developer TEXT,
      publisher TEXT,
      release_date TEXT,
      header_image_url TEXT,
      capsule_image_url TEXT,
      store_url TEXT,
      is_free INTEGER DEFAULT 0,
      is_released INTEGER DEFAULT 1,
      is_available INTEGER DEFAULT 1,
      is_tracked INTEGER DEFAULT 1,
      metadata_status TEXT DEFAULT 'READY',
      metadata_updated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS current_prices (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      currency TEXT NOT NULL DEFAULT 'VND',
      initial_price INTEGER DEFAULT 0,
      final_price INTEGER DEFAULT 0,
      discount_percent INTEGER DEFAULT 0,
      is_free INTEGER DEFAULT 0,
      is_on_sale INTEGER DEFAULT 0,
      source TEXT DEFAULT 'steam_store',
      source_checked_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CONSTRAINT unique_game_currency UNIQUE (game_id, currency)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      currency TEXT NOT NULL DEFAULT 'VND',
      initial_price INTEGER DEFAULT 0,
      final_price INTEGER DEFAULT 0,
      discount_percent INTEGER DEFAULT 0,
      is_free INTEGER DEFAULT 0,
      is_on_sale INTEGER DEFAULT 0,
      fingerprint TEXT NOT NULL,
      source TEXT DEFAULT 'steam_store',
      recorded_at TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lowest_prices (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      currency TEXT NOT NULL DEFAULT 'VND',
      price INTEGER NOT NULL,
      first_recorded_at TEXT NOT NULL,
      last_recorded_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CONSTRAINT unique_lowest_game_currency UNIQUE (game_id, currency)
    );
  `;
}

/**
 * Prioritize Top 10,000 Most Popular & Discounted Steam Games
 */
async function getTop10kTargetAppIds(limit = 10000) {
  const resultAppIds = [];
  const seen = new Set();

  const add = (id) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      resultAppIds.push(id);
    }
  };

  // Priority 1: Add seed list of top popular global games
  TOP_POPULAR_APP_IDS.forEach(add);

  // Priority 2: Fetch Steam Featured Specials (games currently on sale in VN region)
  try {
    console.log("🔥 Fetching Steam Featured Specials (top discounted games in VN region)...");
    const specRes = await fetch("https://store.steampowered.com/api/featuredcategories/?cc=VN&l=vietnamese");
    if (specRes.ok) {
      const specData = await specRes.json();
      const featuredItems = [
        ...(specData?.specials?.items || []),
        ...(specData?.top_sellers?.items || []),
        ...(specData?.new_releases?.items || []),
      ];
      featuredItems.forEach((item) => {
        if (item?.id) add(Number(item.id));
      });
      console.log(`✅ Loaded ${resultAppIds.length} top featured & discounted games.`);
    }
  } catch (err) {
    console.warn("Could not fetch Steam featured specials:", err?.message || err);
  }

  // Priority 3: Fetch existing games from database sorted by priority
  try {
    const dbGames = await sql`
      SELECT g.app_id 
      FROM games g
      LEFT JOIN current_prices cp ON cp.game_id = g.id
      WHERE g.is_tracked = 1
      ORDER BY cp.is_on_sale DESC, cp.source_checked_at ASC
      LIMIT ${limit}
    `;
    if (dbGames) {
      dbGames.forEach((g) => add(Number(g.app_id)));
    }
  } catch {
    // Table might be brand new
  }

  // Priority 4: Fill up to target limit from Steam official Catalog API
  if (resultAppIds.length < limit) {
    try {
      console.log(`🌐 Fetching official Steam catalog list to reach top ${limit} games...`);
      const catRes = await fetch("https://api.steampowered.com/ISteamApps/GetAppList/v2/");
      if (catRes.ok) {
        const catData = await catRes.json();
        const apps = catData?.applist?.apps || [];
        for (const app of apps) {
          if (resultAppIds.length >= limit) break;
          if (app.appid && app.name && app.name.trim().length > 0) {
            add(Number(app.appid));
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch Steam catalog API:", err?.message || err);
    }
  }

  return resultAppIds.slice(0, limit);
}

async function scanGame(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=VN&l=vietnamese`;
  const res = await fetch(url, { headers: { "User-Agent": "SteamPriceVN/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[appId];
  if (!entry?.success || !entry.data) return null;
  return entry.data;
}

async function run() {
  console.log("🚀 Starting Prioritized 10,000 Popular Games Steam Scan...");
  await ensureTables();

  const scanLimit = parseInt(process.env.BATCH_SIZE || "10000", 10);
  const targetAppIds = await getTop10kTargetAppIds(scanLimit);
  let success = 0;

  console.log(`🎯 Priority 10k scan list ready: ${targetAppIds.length} top games scheduled.`);

  for (const appId of targetAppIds) {
    try {
      const data = await scanGame(appId);
      if (!data) continue;

      const name = data.name || `App ${appId}`;
      const isFree = data.is_free ? 1 : 0;
      const priceOverview = data.price_overview;
      const initialPrice = priceOverview ? Math.round(priceOverview.initial / 100) : 0;
      const finalPrice = priceOverview ? Math.round(priceOverview.final / 100) : 0;
      const discountPercent = priceOverview ? priceOverview.discount_percent : 0;
      const now = new Date().toISOString();
      const gameId = `game_${appId}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `app-${appId}`;

      // 1. Upsert game
      await sql`
        INSERT INTO games (id, app_id, name, slug, type, is_free, is_released, is_available, is_tracked, created_at, updated_at)
        VALUES (${gameId}, ${appId}, ${name}, ${slug}, 'game', ${isFree}, 1, 1, 1, ${now}, ${now})
        ON CONFLICT (app_id) DO UPDATE SET name = ${name}, updated_at = ${now};
      `;

      // 2. Upsert current price
      await sql`
        INSERT INTO current_prices (id, game_id, currency, initial_price, final_price, discount_percent, is_free, is_on_sale, source, source_checked_at, created_at, updated_at)
        VALUES (${`cprice_${appId}`}, ${gameId}, 'VND', ${initialPrice}, ${finalPrice}, ${discountPercent}, ${isFree}, ${discountPercent > 0 ? 1 : 0}, 'steam_store', ${now}, ${now}, ${now})
        ON CONFLICT (game_id, currency) DO UPDATE SET initial_price = ${initialPrice}, final_price = ${finalPrice}, discount_percent = ${discountPercent}, source_checked_at = ${now}, updated_at = ${now};
      `;

      console.log(`✅ [SCANNED ${success + 1}/${targetAppIds.length}] ${name} (${appId}): ${finalPrice.toLocaleString("vi-VN")} VND (-${discountPercent}%)`);
      success++;
      await new Promise((r) => setTimeout(r, 600)); // 600ms rate limit delay for high speed
    } catch (err) {
      console.error(`❌ Error scanning appId ${appId}:`, err?.message || err);
    }
  }

  console.log(`🎉 10,000 Popular Games scan completed! Total updated: ${success}/${targetAppIds.length} games in Neon Database.`);
}

run().catch((e) => {
  console.error("Fatal scan error:", e);
  process.exit(1);
});
