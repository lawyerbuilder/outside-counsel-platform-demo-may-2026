/**
 * Push local SQLite schema + data to Turso.
 *
 * Usage: DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node prisma/push-to-turso.mjs
 */
import { createClient } from "@libsql/client";

const localUrl = "file:./prisma/dev.db";
const remoteUrl = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteUrl || !authToken) {
  console.error("Set DATABASE_URL and TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

console.log(`Local: ${localUrl}`);
console.log(`Remote: ${remoteUrl}`);

const local = createClient({ url: localUrl });
const remote = createClient({ url: remoteUrl, authToken });

// 1. Push schema
console.log("\n=== Pushing schema ===");
const schema = await local.execute(
  "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table', 'index') ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 END"
);

let created = 0, skipped = 0;
for (const row of schema.rows) {
  const sql = String(row.sql);
  if (sql.includes("sqlite_")) continue; // skip internal tables
  try {
    await remote.execute(sql);
    created++;
  } catch (e) {
    if (e.message?.includes("already exists")) { skipped++; continue; }
    console.error("Schema error:", sql.substring(0, 80), "->", e.message);
  }
}
console.log(`Schema: ${created} created, ${skipped} skipped`);

// 2. Push data - table by table
console.log("\n=== Pushing data ===");
const tables = await local.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
);

for (const tableRow of tables.rows) {
  const tableName = String(tableRow.name);

  const countResult = await local.execute(`SELECT COUNT(*) as c FROM "${tableName}"`);
  const count = Number(countResult.rows[0].c);
  if (count === 0) { continue; }

  // Read all rows
  const data = await local.execute(`SELECT * FROM "${tableName}"`);
  if (data.rows.length === 0) continue;

  const columns = data.columns;
  const placeholders = columns.map(() => "?").join(", ");
  const insertSql = `INSERT OR IGNORE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

  // Batch insert in chunks of 50
  let inserted = 0;
  const chunkSize = 50;
  for (let i = 0; i < data.rows.length; i += chunkSize) {
    const chunk = data.rows.slice(i, i + chunkSize);
    const batch = chunk.map(row => ({
      sql: insertSql,
      args: columns.map(col => row[col] ?? null),
    }));

    try {
      await remote.batch(batch);
      inserted += chunk.length;
    } catch (e) {
      // Try one by one on failure
      for (const stmt of batch) {
        try {
          await remote.execute(stmt);
          inserted++;
        } catch (e2) {
          // Skip duplicates silently
          if (!e2.message?.includes("UNIQUE constraint")) {
            console.error(`  Error in ${tableName}:`, e2.message?.substring(0, 100));
          }
        }
      }
    }
  }

  console.log(`  ${tableName}: ${inserted}/${count} rows`);
}

// 3. Verify
console.log("\n=== Verification ===");
const remoteTables = await remote.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
);
console.log(`Remote tables: ${remoteTables.rows.length}`);

for (const t of remoteTables.rows) {
  const name = String(t.name);
  const r = await remote.execute(`SELECT COUNT(*) as c FROM "${name}"`);
  const c = Number(r.rows[0].c);
  if (c > 0) console.log(`  ${name}: ${c} rows`);
}

local.close();
remote.close();
console.log("\nDone!");
