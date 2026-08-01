import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL secret!");
  process.exit(1);
}

const sql = neon(dbUrl);

// List of popular Steam App IDs for standalone scan
const APP_IDS = [
  413150, 105600, 588650, 367520, 1145360, 504230,
  268910, 292030, 550, 322330, 814380, 1174180,
  1426210, 374320, 1868140, 646570, 1794680, 632360,
];

async function ensureTables() {
  console.log("🛠 Creating tables in Neon PostgreSQL if not exist...");

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

  console.log("✅ Tables verified/created successfully.");
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
  console.log("🚀 Starting Standalone Steam Price Scan against Neon Database...");
  await ensureTables();
  let success = 0;

  for (const appId of APP_IDS) {
    try {
      const data = await scanGame(appId);
      if (!data) continue;

      const name = data.name;
      const isFree = data.is_free ? 1 : 0;
      const priceOverview = data.price_overview;
      const initialPrice = priceOverview ? Math.round(priceOverview.initial / 100) : 0;
      const finalPrice = priceOverview ? Math.round(priceOverview.final / 100) : 0;
      const discountPercent = priceOverview ? priceOverview.discount_percent : 0;
      const now = new Date().toISOString();
      const gameId = `game_${appId}`;

      // 1. Upsert game
      await sql`
        INSERT INTO games (id, app_id, name, slug, type, is_free, is_released, is_available, is_tracked, created_at, updated_at)
        VALUES (${gameId}, ${appId}, ${name}, ${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}, 'game', ${isFree}, 1, 1, 1, ${now}, ${now})
        ON CONFLICT (app_id) DO UPDATE SET name = ${name}, updated_at = ${now};
      `;

      // 2. Upsert current price
      await sql`
        INSERT INTO current_prices (id, game_id, currency, initial_price, final_price, discount_percent, is_free, is_on_sale, source, source_checked_at, created_at, updated_at)
        VALUES (${`cprice_${appId}`}, ${gameId}, 'VND', ${initialPrice}, ${finalPrice}, ${discountPercent}, ${isFree}, ${discountPercent > 0 ? 1 : 0}, 'steam_store', ${now}, ${now}, ${now})
        ON CONFLICT (game_id, currency) DO UPDATE SET initial_price = ${initialPrice}, final_price = ${finalPrice}, discount_percent = ${discountPercent}, source_checked_at = ${now}, updated_at = ${now};
      `;

      console.log(`✅ [SCANNED] ${name} (${appId}): ${finalPrice.toLocaleString("vi-VN")} VND (-${discountPercent}%)`);
      success++;
      await new Promise((r) => setTimeout(r, 1000)); // 1s delay rate limit
    } catch (err) {
      console.error(`❌ Error scanning appId ${appId}:`, err?.message || err);
    }
  }

  console.log(`🎉 Standalone scan completed successfully! Total scanned: ${success}/${APP_IDS.length}`);
}

run().catch((e) => {
  console.error("Fatal scan error:", e);
  process.exit(1);
});
