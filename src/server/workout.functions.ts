import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { workout, workoutSet } from "#/db/schema";
import env from "#/env";
import { parseStrongExport, toWorkoutInput } from "#/lib/strong-import";
import { isoDate } from "#/lib/zod-schemas/common";
import { workoutInput } from "#/lib/zod-schemas/workout";
import { authMiddleware } from "./middleware";
import { insertSets } from "./workout.db";

/**
 * Create (no `id`) or update (with `id`) a workout together with its sets.
 *
 * Sets are treated as part of the workout: on every save the old sets are
 * replaced by the list sent from the form. Simpler than diffing rows, and
 * `position` always matches the order on screen.
 */
export const saveWorkout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(workoutInput)
  .handler(async ({ data, context: { userId } }) => {
    const { id, sets, ...fields } = data;

    // One DB transaction: either the workout AND its sets are saved, or nothing is.
    return db.transaction(async (tx) => {
      let saved: typeof workout.$inferSelect | undefined;

      if (id) {
        // Filter by userId too — otherwise anyone who guesses an id could edit it.
        [saved] = await tx
          .update(workout)
          .set(fields) // updatedAt is bumped by $onUpdate here (plain update)
          .where(
            and(
              eq(workout.id, id),
              eq(workout.userId, userId),
              isNull(workout.deletedAt),
            ),
          )
          .returning();

        if (!saved) throw new Error("Workout not found");

        await tx.delete(workoutSet).where(eq(workoutSet.workoutId, saved.id));
      } else {
        [saved] = await tx
          .insert(workout)
          .values({ ...fields, userId })
          .returning();
      }

      const savedSets = await insertSets(tx, saved.id, sets);

      // Same shape as getCheckIn's workouts, so the UI can use either.
      return { ...saved, sets: savedSets };
    });
  });

const MAX_IMPORT = 50;

type ImportedLabel = { date: string; title: string | null };

/**
 * Import workouts from text copied out of the Strong app.
 *
 * Takes the raw text, not parsed objects: the server parses it again with the same
 * parser, so nothing built in the browser is trusted. Times are read in APP_TIMEZONE.
 *
 * Each workout is saved on its own (one bad workout doesn't block the rest).
 * Already-imported ones (same Strong link) are skipped, not duplicated.
 */
export const importStrongWorkouts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ text: z.string().max(200_000) }))
  .handler(async ({ data: { text }, context: { userId } }) => {
    const { workouts, warnings } = parseStrongExport(text);
    if (workouts.length > MAX_IMPORT) {
      throw new Error(`Too many workouts at once (max ${MAX_IMPORT})`);
    }

    const imported: (ImportedLabel & { id: string })[] = [];
    const skipped: ImportedLabel[] = [];
    const failed: (ImportedLabel & { reason: string })[] = [];

    for (const parsed of workouts) {
      const label = { date: parsed.date, title: parsed.title };

      // Same rules as manual saves (e.g. RPE 1–10, reps ≤ 1000).
      const result = workoutInput.safeParse(
        toWorkoutInput(parsed, env.APP_TIMEZONE),
      );
      if (!result.success) {
        failed.push({ ...label, reason: result.error.issues[0].message });
        continue;
      }
      const { id: _new, sets, ...fields } = result.data;

      const saved = await db.transaction(async (tx) => {
        // ON CONFLICT DO NOTHING on the (user, sourceUrl) partial unique index:
        // a duplicate inserts nothing and returns no row. Atomic, so even a
        // double-click can't create two copies.
        const [row] = await tx
          .insert(workout)
          .values({ ...fields, userId })
          .onConflictDoNothing({
            target: [workout.userId, workout.sourceUrl],
            // Must match the index's WHERE, or Postgres can't use it.
            where: sql`${workout.deletedAt} is null and ${workout.sourceUrl} is not null`,
          })
          .returning();
        if (!row) return null;
        await insertSets(tx, row.id, sets);
        return row;
      });

      if (saved) imported.push({ ...label, id: saved.id });
      else skipped.push(label);
    }

    return { imported, skipped, failed, warnings };
  });

/** Workouts between two dates (inclusive), each with its sets. Newest first. */
export const getWorkoutRange = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({ from: isoDate, to: isoDate }).refine((v) => v.from <= v.to, {
      message: "`from` must be on or before `to`",
    }),
  )
  .handler(async ({ data: { from, to }, context: { userId } }) => {
    const workouts = await db.query.workout.findMany({
      where: (w, { and, eq, gte, lte, isNull }) =>
        and(
          eq(w.userId, userId),
          gte(w.date, from),
          lte(w.date, to),
          isNull(w.deletedAt),
        ),
      orderBy: (w, { desc }) => [desc(w.date), desc(w.startedAt)],
      with: {
        sets: {
          where: (s, { isNull }) => isNull(s.deletedAt),
          orderBy: (s, { asc }) => [asc(s.position)],
        },
      },
    });
    return { workouts };
  });
