// Applies pending DB migrations, then exits. Runs on every container start (scripts/start.sh).
//
// Standalone on purpose: it doesn't import src/env.ts or src/db (those need every app env
// var). The Docker build bundles this file *with* drizzle-orm and pg into one migrate.mjs,
// because the Nitro server output has its dependencies inlined and nothing else installed.

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
await migrate(drizzle(pool), {
  migrationsFolder: process.env.MIGRATIONS_DIR ?? "./src/db/migrations",
});
await pool.end();
console.log("[migrate] Migrations complete");
