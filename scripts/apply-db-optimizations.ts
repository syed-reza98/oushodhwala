import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env.local, .env.production, or .env
for (const envFile of [".env.local", ".env.production", ".env"]) {
  const p = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("[db-optimizations] Connecting to database...");
  const conn = await mysql.createConnection(url);

  try {
    // 1. Users email unique index
    console.log("[1/4] Checking users email unique index...");
    const [userIndexes] = (await conn.query(`SHOW INDEX FROM users`)) as unknown as [Array<{ Key_name: string }>];
    const hasUserEmailUnique = userIndexes.some((idx) => idx.Key_name === "users_email_unique");

    if (!hasUserEmailUnique) {
      console.log("-> Adding UNIQUE KEY users_email_unique (email)...");
      // Check for duplicates first
      const [dupes] = (await conn.query(`
        SELECT email, COUNT(*) as cnt 
        FROM users 
        GROUP BY email 
        HAVING cnt > 1
      `)) as unknown as [Array<{ email: string; cnt: number }>];

      if (dupes.length > 0) {
        console.warn(`-> Found ${dupes.length} duplicate emails. Retaining latest user accounts...`);
        for (const d of dupes) {
          await conn.query(`
            DELETE u1 FROM users u1
            INNER JOIN users u2 
            WHERE u1.email = u2.email AND u1.created_at < u2.created_at AND u1.email = ?
          `, [d.email]);
        }
      }

      await conn.query(`ALTER TABLE users ADD UNIQUE KEY users_email_unique (email)`);
      console.log("-> Added UNIQUE KEY users_email_unique successfully.");
    } else {
      console.log("-> users_email_unique already exists.");
    }

    // 2. Orders order_no unique index
    console.log("[2/4] Checking orders order_no unique index...");
    const [orderIndexes] = (await conn.query(`SHOW INDEX FROM orders`)) as unknown as [Array<{ Key_name: string }>];
    const hasOrderNoUnique = orderIndexes.some((idx) => idx.Key_name === "orders_order_no_unique");

    if (!hasOrderNoUnique) {
      console.log("-> Adding UNIQUE KEY orders_order_no_unique (order_no)...");
      const [dupeOrders] = (await conn.query(`
        SELECT order_no, COUNT(*) as cnt 
        FROM orders 
        GROUP BY order_no 
        HAVING cnt > 1
      `)) as unknown as [Array<{ order_no: string; cnt: number }>];

      if (dupeOrders.length > 0) {
        console.warn(`-> Found ${dupeOrders.length} duplicate order numbers. Renaming duplicates...`);
        for (const o of dupeOrders) {
          const [matching] = (await conn.query(`SELECT id FROM orders WHERE order_no = ? ORDER BY created_at ASC`, [o.order_no])) as unknown as [Array<{ id: string }>];
          for (let i = 1; i < matching.length; i++) {
            const newNo = `${o.order_no}-DUP${i}`;
            await conn.query(`UPDATE orders SET order_no = ? WHERE id = ?`, [newNo, matching[i]!.id]);
          }
        }
      }

      await conn.query(`ALTER TABLE orders ADD UNIQUE KEY orders_order_no_unique (order_no)`);
      console.log("-> Added UNIQUE KEY orders_order_no_unique successfully.");
    } else {
      console.log("-> orders_order_no_unique already exists.");
    }

    // 3. Foreign key on order_events -> orders (cascade)
    console.log("[3/4] Checking order_events foreign key...");
    const [fkRows] = (await conn.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_events' 
        AND REFERENCED_TABLE_NAME = 'orders'
    `)) as unknown as [Array<{ CONSTRAINT_NAME: string }>];

    if (fkRows.length === 0) {
      console.log("-> Cleaning orphan order_events...");
      await conn.query(`
        DELETE FROM order_events 
        WHERE order_id NOT IN (SELECT id FROM orders)
      `);
      console.log("-> Adding FOREIGN KEY constraint on order_events (order_id)...");
      await conn.query(`
        ALTER TABLE order_events 
        ADD CONSTRAINT order_events_order_id_orders_id_fk 
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      `);
      console.log("-> Foreign key added successfully.");
    } else {
      console.log("-> Foreign key on order_events already exists.");
    }

    // 4. FULLTEXT index on products (name, en, generic, brand, manufacturer)
    console.log("[4/4] Checking products FULLTEXT index...");
    const [prodIndexes] = (await conn.query(`SHOW INDEX FROM products`)) as unknown as [Array<{ Key_name: string; Index_type: string }>];
    const hasFt = prodIndexes.some((idx) => idx.Key_name === "products_search_ft");

    if (!hasFt) {
      console.log("-> Adding FULLTEXT KEY products_search_ft on products (name, en, generic, brand, manufacturer)...");
      await conn.query(`
        ALTER TABLE products 
        ADD FULLTEXT KEY products_search_ft (name, en, generic, brand, manufacturer)
      `);
      console.log("-> FULLTEXT index added successfully.");
    } else {
      console.log("-> products_search_ft already exists.");
    }

    console.log("\n[SUCCESS] Database optimizations completed successfully!");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("[db-optimizations error]", err);
  process.exit(1);
});
