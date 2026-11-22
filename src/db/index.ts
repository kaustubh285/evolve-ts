import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.ts";
import env from "#/env.ts";

// We create the pool ourselves (instead of drizzle(url)) to attach an error handler.
// When Postgres drops an IDLE connection — container restart, upgrade, reboot order —
// node-postgres emits 'error' on the pool. With no listener, Node treats that as an
// unhandled error and the whole server process exits. Logging it is enough: the dead
// client is already removed from the pool, and the next query opens a fresh one.
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 5, // one user; keep RAM/connections modest on a shared box
});
pool.on("error", (err) => {
  console.error("[db] idle connection dropped:", err.message);
});

export const db = drizzle(pool, { schema, casing: "snake_case" });
