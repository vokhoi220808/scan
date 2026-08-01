import { sql } from "drizzle-orm";
import { db } from "../worker-db";

export async function claimTasks(runId: string, limit: number) {
  // Use Raw SQL for FOR UPDATE SKIP LOCKED
  const query = sql`
    WITH candidates AS (
      SELECT id FROM scan_tasks
      WHERE run_id = ${runId} 
        AND status IN ('PENDING', 'RETRY')
        AND (locked_until IS NULL OR locked_until < NOW())
      ORDER BY id
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE scan_tasks
    SET status = 'RUNNING', locked_until = NOW() + INTERVAL '15 minutes', attempts = attempts + 1
    WHERE id IN (SELECT id FROM candidates)
    RETURNING *;
  `;
  
  // Actually Neon serverless @neondatabase/serverless with drizzle might not return the parsed row perfectly unless we use db.execute
  // Drizzle allows db.execute(sql) which returns raw result
  const result = await db.execute(query);
  return result.rows || result; 
}
