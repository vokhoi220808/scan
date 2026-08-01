import { createPopularityCycle, createScanRunAndTasks } from "../db/queries/create-cycle";
import { runScanEngine } from "./engine";
import { db } from "../db/worker-db";
import { popularityCycles, scanRuns } from "../db/schema";
import { desc, eq } from "drizzle-orm";

async function run() {
  let partArg = process.argv.find(arg => arg.startsWith('--part='));
  let part = partArg ? parseInt(partArg.split('=')[1], 10) : null;

  if (part && isNaN(part)) {
    console.error("Usage: npx tsx scanner/standalone-scan.ts [--part=<1|2|3|4>]");
    process.exit(1);
  }

  // 1. Check if we have an active cycle
  let activeCycleRes = await db.select().from(popularityCycles).orderBy(desc(popularityCycles.createdAt)).limit(1);
  let cycle = activeCycleRes[0];

  // If no cycle or the cycle is older than 4 days, create a new one
  if (!cycle || new Date(cycle.createdAt).getTime() < Date.now() - 4 * 24 * 60 * 60 * 1000) {
    console.log("⚠️ No active cycle or cycle expired. Generating a new 4-day Popularity Cycle...");
    const cycleId = await createPopularityCycle();
    const newCycles = await db.select().from(popularityCycles).where(eq(popularityCycles.id, cycleId));
    cycle = newCycles[0];
    console.log(`✅ Cycle created: ${cycle.id}`);
  } else {
    console.log(`🔄 Using existing Cycle: ${cycle.id}`);
  }

  // 1.5 Auto-detect Part if not provided
  if (!part) {
    const existingRuns = await db.select().from(scanRuns).where(eq(scanRuns.cycleId, cycle.id));
    const completedParts = new Set(existingRuns.map(r => r.part));
    for (let p = 1; p <= 4; p++) {
      if (!completedParts.has(p)) {
        part = p;
        break;
      }
    }
    // If all 4 parts exist in this cycle, we might be re-running the last part or retrying
    if (!part) part = 4;
    console.log(`🔍 Auto-detected Part ${part} for Cycle ${cycle.id}`);
  }

  console.log(`🚀 Triggering Worker for Part ${part}...`);

  // 2. Check if a run for this part in this cycle already exists
  let runRes = await db.select().from(scanRuns).where(eq(scanRuns.cycleId, cycle.id)).where(eq(scanRuns.part, part)).limit(1);
  let run = runRes[0];

  if (!run) {
    console.log(`⚠️ No Scan Run found for Part ${part} in Cycle ${cycle.id}. Creating Run & Tasks...`);
    const runId = await createScanRunAndTasks(cycle.id, part);
    const newRuns = await db.select().from(scanRuns).where(eq(scanRuns.id, runId));
    run = newRuns[0];
    console.log(`✅ Scan Run created: ${run.id}`);
  } else {
    console.log(`🔄 Resuming existing Scan Run: ${run.id}`);
  }

  // 3. Start the Engine!
  await runScanEngine(run.id);
  
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal Worker Error:", err);
  process.exit(1);
});
