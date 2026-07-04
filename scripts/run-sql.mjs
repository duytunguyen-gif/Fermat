/**
 * Chạy một file .sql lên Postgres qua chuỗi kết nối.
 *
 * Chạy:
 *   node scripts/run-sql.mjs supabase/schema.sql "postgresql://…"
 * hoặc đặt DATABASE_URL trong môi trường:
 *   node --env-file=.env.local scripts/run-sql.mjs supabase/schema.sql
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const connectionString = process.argv[3] || process.env.DATABASE_URL;

if (!file || !connectionString) {
  console.error("Cách dùng: node scripts/run-sql.mjs <file.sql> <connectionString>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`→ Đang chạy ${file} …`);
  await client.query(sql);
  console.log("✅ Chạy SQL thành công.");
} catch (err) {
  console.error("❌ Lỗi SQL:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
