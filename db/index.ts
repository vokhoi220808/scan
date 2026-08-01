import { env } from "cloudflare:workers";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.ts";

let neonDbInstance: any = null;

export function getDb() {
  const dbUrl = process.env.DATABASE_URL;

  // 1. Prioritize Neon PostgreSQL if DATABASE_URL is set
  if (dbUrl && dbUrl.startsWith("postgres")) {
    if (!neonDbInstance) {
      const sql = neon(dbUrl);
      neonDbInstance = drizzleNeon(sql, { schema });
    }
    return neonDbInstance;
  }

  // 2. Cloudflare D1 environment fallback
  if (typeof env !== "undefined" && env?.DB) {
    return drizzleD1(env.DB, { schema });
  }

  // 3. Fallback mock database for build/test environments when DB is unattached
  return {
    select: () => ({
      from: () => ({
        where: () => ({ get: async () => null, all: async () => [] }),
        innerJoin: () => ({ where: () => ({ get: async () => null, all: async () => [] }) }),
        leftJoin: () => ({ where: () => ({ get: async () => null, all: async () => [], orderBy: () => ({ all: async () => [] }) }) }),
        orderBy: () => ({ all: async () => [], limit: () => ({ all: async () => [] }) }),
      }),
    }),
    insert: () => ({ values: async () => ({}) }),
    update: () => ({ set: () => ({ where: () => ({ execute: async () => ({}) }) }) }),
    delete: () => ({ where: async () => ({}) }),
  };
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
