import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  base,
  createdAt,
  day,
  deletedAt,
  id,
  updatedAt,
} from "../schema-helper";
import { user } from "./auth";

// Units are in the column names so nobody has to guess.
export const workout = pgTable(
  "workout",
  {
    ...base(),
    date: day(),

    startedAt: timestamp({ withTimezone: true }),
    durationMin: integer(),
    quality: integer(), // 1–5

    // Cardio (all null for a pure strength session)
    cardioType: text(), // cycling_indoor, running_outdoor, running_treadmill, walking, …
    cardioDurationMin: integer(),
    cardioDistanceM: integer(),

    notes: text(),
  },
  (t) => [
    index("workout_user_date_idx").on(t.userId, t.date),
    check("workout_quality_range", sql`${t.quality} between 1 and 5`),
    check("workout_duration_positive", sql`${t.durationMin} > 0`),
  ],
);

// One row per set. Belongs to a workout; user is reachable through it.
export const workoutSet = pgTable(
  "workout_set",
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
    workoutId: uuid()
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),

    position: integer().notNull(), // order within the workout
    exercise: text().notNull(),
    equipment: text(),
    weightKg: numeric({ precision: 6, scale: 2, mode: "number" }), // 22.5 kg etc.
    reps: integer(),
    rpe: integer(), // effort 1–10
  },
  (t) => [
    index("workout_set_workout_idx").on(t.workoutId, t.position),
    check("workout_set_rpe_range", sql`${t.rpe} between 1 and 10`),
  ],
);

export const workoutRelations = relations(workout, ({ one, many }) => ({
  user: one(user, {
    fields: [workout.userId],
    references: [user.id],
  }),
  sets: many(workoutSet),
}));

export const workoutSetRelations = relations(workoutSet, ({ one }) => ({
  workout: one(workout, {
    fields: [workoutSet.workoutId],
    references: [workout.id],
  }),
}));
