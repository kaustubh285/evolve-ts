import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { workout, workoutSet } from "#/db/schema";
import { workoutInput } from "#/lib/zod-schemas/workout";
import { authMiddleware } from "./middleware";

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

      const savedSets =
        sets.length > 0
          ? await tx
              .insert(workoutSet)
              .values(
                sets.map((set, position) => ({
                  ...set,
                  workoutId: saved.id,
                  position,
                })),
              )
              .returning()
          : [];

      // Same shape as getCheckIn's workouts, so the UI can use either.
      return { ...saved, sets: savedSets };
    });
  });
