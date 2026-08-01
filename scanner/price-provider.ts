/**
 * Robust Game detail fetcher with Exponential Backoff on 429 Rate Limits
 */
export async function scanGame(appId: number, retries = 3): Promise<any> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=VN&l=vietnamese`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "SteamPriceVN/1.0" } });
      
      if (res.status === 429) {
        // Steam rate-limiting: exponential backoff wait 2.5s -> 5s -> 10s
        const waitMs = (attempt + 1) * 2500;
        console.warn(`⚠️ Steam Rate Limited (429) on appId ${appId}. Cooling down ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      
      if (!res.ok) return null;
      
      const data = await res.json();
      const entry = data[appId];
      if (!entry?.success || !entry.data) return null;
      return entry.data;
    } catch (err) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}
