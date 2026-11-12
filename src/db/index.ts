import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/user";
import { env } from "@/lib/env";

function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return drizzle(pool, { schema, logger: env.NODE_ENV === "development" });
}

const db = env.DATABASE_URL ? createDatabase(env.DATABASE_URL) : undefined;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is required for dashboard database access.");
  }
  return db;
}

/**
 * Export schema for use in other files
 */
export * from "./schema/user";

/**
 * Type helper for database transactions
 */
export type Database = ReturnType<typeof createDatabase>;
