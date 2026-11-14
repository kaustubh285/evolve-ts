import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { HEALTH_EVENT_TYPES } from "../../lib/zod-schemas/health-event";
import { base, day } from "../schema-helper";
import { user } from "./auth";

export const healthEventType = pgEnum("health_event_type", HEALTH_EVENT_TYPES);

export const healthEvent = pgTable(
  "health_event",
  {
    ...base(),
    // The day it STARTED (derived from startedAt on save). Links it to that day's check-in.
    date: day(),

    type: healthEventType().notNull(),
    startedAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }), // null = ongoing / unknown
    severity: integer(), // 1–10
    medication: text(),
    notes: text(),
  },
  (t) => [
    index("health_event_user_date_idx").on(t.userId, t.date),
    check("health_event_severity_range", sql`${t.severity} between 1 and 10`),
    check("health_event_time_order", sql`${t.endedAt} >= ${t.startedAt}`),
  ],
);

export const healthEventRelations = relations(healthEvent, ({ one }) => ({
  user: one(user, {
    fields: [healthEvent.userId],
    references: [user.id],
  }),
}));
