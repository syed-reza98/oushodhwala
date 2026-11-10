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

  const poolLimit = Number(process.env.DB_POOL_LIMIT || 10);

  // If URL string contains query params, mysql2 parses them; pool options provide resilient defaults
  const p = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: poolLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  // Handle transient connection drops without crashing Node.js process
  p.on("connection", (connection) => {
    connection.on("error", (err: unknown) => {
      console.warn("[mysql pool connection error]", err);
    });
  });

  return p;
}

export const pool = globalForDb.mysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });

