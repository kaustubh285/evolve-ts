import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema/index.ts";
import env from "#/env.ts";

export const db = drizzle(env.DATABASE_URL, { schema, casing: "snake_case" });
