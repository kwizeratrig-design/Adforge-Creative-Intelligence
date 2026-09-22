import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();

export const pool = connectionString ? new Pool({ connectionString }) : null;

export function requireDb() {
  if (!pool) {
    throw new Error(
      "DATABASE_URL must be set before using the database. Did you forget to provision a database?",
    );
  }

  return drizzle(pool, { schema });
}

export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const liveDb = requireDb();
    const value = (liveDb as any)[prop];
    return typeof value === "function" ? value.bind(liveDb) : value;
  },
});

export * from "./schema";
