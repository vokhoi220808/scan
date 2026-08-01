import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in environment variables!");
}

const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });
