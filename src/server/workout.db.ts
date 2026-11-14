// Server-only DB helpers for workouts.
//
// Kept out of workout.functions.ts on purpose: TanStack Start strips imports that
// are only used inside `.handler(...)` from the browser bundle, but anything at the
// top level of a *.functions.ts file — even a type alias mentioning `db` — keeps
// its import, which ships `#/db` (pg, dotenv) to the browser and crashes the app.
// Only import this file from inside handlers.

import type { z } from "zod";
import type { db } from "#/db";
import { workoutSet } from "#/db/schema";
import type { workoutInput } from "#/lib/zod-schemas/workout";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SetValues = z.output<typeof workoutInput>["sets"];

/** Insert a workout's sets; `position` = order in the list. */
export async function insertSets(tx: Tx, workoutId: string, sets: SetValues) {
  if (sets.length === 0) return [];
  return tx
    .insert(workoutSet)
    .values(sets.map((set, position) => ({ ...set, workoutId, position })))
    .returning();
}
