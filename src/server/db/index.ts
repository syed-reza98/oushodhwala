import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return mysql.createPool(url);
}

export const pool = globalForDb.mysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
