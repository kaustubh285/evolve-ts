import { date, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./schema/auth";

// Functions, not shared instances: Drizzle column builders are mutable, so
// every table needs its own fresh builder. Use as `...base()` or `id: id()`.

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const deletedAt = () => timestamp({ withTimezone: true });

// Auth tables use text ids (Better Auth generates them), so FKs to user are text.
export const userId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

// The user's calendar day (no time, no timezone). This is what links
// workouts / transactions / health events to that day's check-in.
export const day = () => date({ mode: "string" }).notNull();

// Common columns for every app table.
export const base = () => ({
  id: id(),
  userId: userId(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});
