import { db } from "../db/worker-db";
import { scanTasks } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { claimTasks } from "../db/queries/claim-tasks";
import { updatePriceTransaction } from "../db/queries/update-price";
import { scanGame } from "./price-provider";

export async function runScanEngine(runId: string) {
  console.log(`🚀 Starting Scan Engine for Run ID: ${runId}`);
  
  let totalProcessed = 0;
  let totalSuccess = 0;

  while (true) {
    // 1. Claim up to 100 tasks at a time safely with FOR UPDATE SKIP LOCKED
    const tasks = await claimTasks(runId, 100);
    if (!tasks || tasks.length === 0) {
      console.log(`✅ No more pending tasks found for Run ${runId}.`);
      break;
    }

    console.log(`🔒 Claimed ${tasks.length} tasks. Processing batch...`);

    // Process tasks in sequence with pacing to respect Steam 429 limits
    for (const task of tasks) {
      try {
        // Find the actual app id from the games table.
        // But wait, the task gameId is like 'game_730', we can extract the appId
        const appId = parseInt(task.game_id.replace("game_", ""), 10);
        
        if (isNaN(appId)) {
           throw new Error(`Invalid game_id format: ${task.game_id}`);
        }

        const data = await scanGame(appId);
        
        if (data) {
          await updatePriceTransaction(appId, data);
          
          // Mark task success
          await db.update(scanTasks).set({
            status: 'SUCCESS',
            completedAt: new Date().toISOString()
          }).where(eq(scanTasks.id, task.id));
          
          totalSuccess++;
        } else {
          // Mark task failed/retry
          await db.update(scanTasks).set({
            status: task.attempts >= 3 ? 'FAILED' : 'RETRY',
            lastErrorCode: 'FETCH_FAILED'
          }).where(eq(scanTasks.id, task.id));
        }

      } catch (err: any) {
        console.error(`❌ Failed to process task ${task.id} (Game: ${task.game_id}):`, err.message);
        await db.update(scanTasks).set({
            status: task.attempts >= 3 ? 'FAILED' : 'RETRY',
            lastErrorCode: 'INTERNAL_ERROR'
        }).where(eq(scanTasks.id, task.id));
      }

      totalProcessed++;
      
      // Safe pacing delay: 350ms between requests keeps Steam API completely happy
      await new Promise((r) => setTimeout(r, 350));
    }
    
    console.log(`📊 Progress: Processed ${totalProcessed} tasks. Success: ${totalSuccess}`);
  }

  console.log(`🎉 Engine Cycle Complete for Run ID: ${runId}! Total Processed: ${totalProcessed} (Success: ${totalSuccess})`);
}
