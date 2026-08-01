import { db } from "../worker-db";
import { games, currentPrices, priceHistory, lowestPrices, priceEvents } from "../schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function updatePriceTransaction(appId: number, data: any) {
  return await db.transaction(async (tx) => {
    const name = data.name || `App ${appId}`;
    const isFree = data.is_free;
    const priceOverview = data.price_overview;
    const initialPrice = priceOverview ? Math.round(priceOverview.initial / 100) : 0;
    const finalPrice = priceOverview ? Math.round(priceOverview.final / 100) : 0;
    const discountPercent = priceOverview ? priceOverview.discount_percent : 0;
    const headerImage = data.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const capsuleImage = data.capsule_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
    const shortDesc = data.short_description || "";
    const developers = Array.isArray(data.developers) ? data.developers.join(", ") : "Chưa cập nhật";
    const publishers = Array.isArray(data.publishers) ? data.publishers.join(", ") : "Chưa cập nhật";
    const releaseDate = data.release_date?.date || "Chưa cập nhật";
    const now = new Date().toISOString();
    const gameId = `game_${appId}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `app-${appId}`;
    
    const fingerprint = [gameId, "VND", initialPrice, finalPrice, discountPercent, isFree ? 1 : 0].join(":");

    // 1. Upsert Game
    await tx.insert(games).values({
      id: gameId,
      appId,
      name,
      slug,
      shortDescription: shortDesc,
      developer: developers,
      publisher: publishers,
      releaseDate,
      headerImageUrl: headerImage,
      capsuleImageUrl: capsuleImage,
      storeUrl: `https://store.steampowered.com/app/${appId}`,
      isFree,
      isReleased: true,
      isAvailable: true,
      isTracked: true,
      metadataStatus: 'READY',
      metadataUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: games.appId,
      set: {
        name,
        shortDescription: shortDesc,
        developer: developers,
        publisher: publishers,
        headerImageUrl: headerImage,
        capsuleImageUrl: capsuleImage,
        updatedAt: now,
      }
    });

    // Fetch existing price to check if history is needed
    const existingPrices = await tx.select().from(currentPrices).where(and(eq(currentPrices.gameId, gameId), eq(currentPrices.currency, 'VND'))).limit(1);
    const existingPrice = existingPrices[0];
    let priceChanged = true;
    let oldPrice = 0;
    let oldDiscount = 0;
    
    if (existingPrice) {
      if (existingPrice.finalPrice === finalPrice && existingPrice.initialPrice === initialPrice && existingPrice.discountPercent === discountPercent) {
        priceChanged = false;
      }
      oldPrice = existingPrice.finalPrice;
      oldDiscount = existingPrice.discountPercent;
    }

    // 2. Upsert Current Price
    await tx.insert(currentPrices).values({
      id: `cprice_${appId}`,
      gameId,
      currency: 'VND',
      initialPrice,
      finalPrice,
      discountPercent,
      isFree,
      isOnSale: discountPercent > 0,
      source: 'steam_store',
      sourceCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [currentPrices.gameId, currentPrices.currency],
      set: {
        initialPrice,
        finalPrice,
        discountPercent,
        isOnSale: discountPercent > 0,
        sourceCheckedAt: now,
        updatedAt: now,
      }
    });

    // 3. Upsert Price History ONLY if it changed
    if (priceChanged) {
      const historyId = `phist_${appId}_${Date.now()}`;
      await tx.insert(priceHistory).values({
        id: historyId,
        gameId,
        currency: 'VND',
        initialPrice,
        finalPrice,
        discountPercent,
        isFree,
        isOnSale: discountPercent > 0,
        fingerprint,
        source: 'steam_store',
        recordedAt: now,
      }).onConflictDoNothing();

      // Trigger event if we care about it
      await tx.insert(priceEvents).values({
        id: crypto.randomUUID(),
        gameId,
        eventType: 'PRICE_CHANGED',
        previousPrice: existingPrice ? oldPrice : null,
        currentPrice: finalPrice,
        previousDiscount: existingPrice ? oldDiscount : null,
        currentDiscount: discountPercent,
        priceHistoryId: historyId,
        fingerprint,
        occurredAt: now,
      }).onConflictDoNothing();
    }

    // 4. Upsert Lowest Price
    const lowestRecords = await tx.select().from(lowestPrices).where(and(eq(lowestPrices.gameId, gameId), eq(lowestPrices.currency, 'VND'))).limit(1);
    if (!lowestRecords.length) {
      await tx.insert(lowestPrices).values({
        id: `lowest_${appId}`,
        gameId,
        currency: 'VND',
        price: finalPrice,
        firstRecordedAt: now,
        lastRecordedAt: now,
        updatedAt: now,
      });
    } else {
      const currentLowest = lowestRecords[0].price;
      if (finalPrice < currentLowest) {
        await tx.update(lowestPrices).set({
          price: finalPrice,
          lastRecordedAt: now,
          updatedAt: now,
        }).where(eq(lowestPrices.id, lowestRecords[0].id));
      } else if (finalPrice === currentLowest) {
        await tx.update(lowestPrices).set({
          lastRecordedAt: now,
          updatedAt: now,
        }).where(eq(lowestPrices.id, lowestRecords[0].id));
      }
    }
    
    return true;
  });
}
