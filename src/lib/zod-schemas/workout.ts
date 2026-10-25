import { z } from "zod";
import { isoDate, optionalInt, optionalText } from "./common";

export const workoutSetInput = z.object({
  exercise: z.string().trim().min(1, "Exercise is required").max(100),
  equipment: optionalText(100),
  weightKg: z.number().min(0).max(1000).nullable(),
  reps: optionalInt(0, 1000),
  rpe: optionalInt(1, 10),
});

// No `id` → create. With `id` → update that workout.
// `sets` is the complete list in order; the server derives `position` from the index.
export const workoutInput = z.object({
  id: z.uuid().optional(),
  date: isoDate,

  startedAt: z.date().nullable(),
  durationMin: optionalInt(1, 24 * 60),
  quality: optionalInt(1, 5),

  cardioType: optionalText(50),
  cardioDurationMin: optionalInt(1, 24 * 60),
  cardioDistanceM: optionalInt(0, 1_000_000),

  notes: optionalText(2000),
  sets: z.array(workoutSetInput).max(200).default([]),
});

export type WorkoutInput = z.input<typeof workoutInput>;
export type WorkoutSetInput = z.input<typeof workoutSetInput>;
