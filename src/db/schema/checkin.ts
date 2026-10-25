import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { base, day } from "../schema-helper";
import { user } from "./auth";

// One per user per day. Everything except `date` is nullable so a
// check-in can be saved partially and completed later.
export const checkIn = pgTable(
  "check_in",
  {
    ...base(),
    date: day(),

    // Sleep: the night that ended on the morning of `date`.
    sleepStart: timestamp({ withTimezone: true }),
    sleepEnd: timestamp({ withTimezone: true }),
    sleepQuality: integer(), // 1–5

    // Food
    meal: text(),
    proteinAtBreakfast: boolean(),
    proteinAtLunch: boolean(),
    proteinAtDinner: boolean(),

    steps: integer(),
    notes: text(),
  },
  (t) => [
    // Partial: a soft-deleted check-in doesn't block re-creating that day.
    uniqueIndex("check_in_user_date_uq")
      .on(t.userId, t.date)
      .where(sql`${t.deletedAt} is null`),
    check("check_in_sleep_quality_range", sql`${t.sleepQuality} between 1 and 5`),
    check("check_in_sleep_order", sql`${t.sleepEnd} > ${t.sleepStart}`),
    check("check_in_steps_positive", sql`${t.steps} >= 0`),
  ],
);

export const checkInRelations = relations(checkIn, ({ one }) => ({
  user: one(user, {
    fields: [checkIn.userId],
    references: [user.id],
  }),
}));
