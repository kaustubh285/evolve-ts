import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { checkIn, healthEvent, transaction } from "#/db/schema";
import env from "#/env";
import { checkInInput } from "#/lib/zod-schemas/check-in";
import { dayInput, isoDate } from "#/lib/zod-schemas/common";
import { withDayEntries } from "./check-in.db";
import { authMiddleware } from "./middleware";

/**
 * Everything recorded for one day: the check-in (or null) plus the
 * workouts / transactions / health events that share its date.
 */
export const getCheckIn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(dayInput)
  .handler(async ({ data: { date }, context: { userId } }) => {
    // The four reads don't depend on each other → run them in parallel.
    const [checkInRows, workouts, transactions, healthEvents] =
      await Promise.all([
        db
          .select()
          .from(checkIn)
          .where(
            and(
              eq(checkIn.userId, userId),
              eq(checkIn.date, date),
              isNull(checkIn.deletedAt),
            ),
          )
          .limit(1),

        // Relational query API (db.query.*): uses the `relations()` from the
        // schema to fetch each workout WITH its sets in one call.
        db.query.workout.findMany({
          where: (w, { and, eq, isNull }) =>
            and(eq(w.userId, userId), eq(w.date, date), isNull(w.deletedAt)),
          orderBy: (w, { asc }) => [asc(w.startedAt), asc(w.createdAt)],
          with: {
            sets: {
              where: (s, { isNull }) => isNull(s.deletedAt),
              orderBy: (s, { asc }) => [asc(s.position)],
            },
          },
        }),

        db
          .select()
          .from(transaction)
          .where(
            and(
              eq(transaction.userId, userId),
              eq(transaction.date, date),
              isNull(transaction.deletedAt),
            ),
          )
          .orderBy(asc(transaction.createdAt)),

        db
          .select()
          .from(healthEvent)
          .where(
            and(
              eq(healthEvent.userId, userId),
              eq(healthEvent.date, date),
              isNull(healthEvent.deletedAt),
            ),
          )
          .orderBy(asc(healthEvent.startedAt), asc(healthEvent.createdAt)),
      ]);

    return {
      date,
      // The form shows/enters sleep times in this zone (same on server + browser).
      timeZone: env.APP_TIMEZONE,
      checkIn: checkInRows[0] ?? null,
      workouts,
      transactions,
      healthEvents,
    };
  });

export const saveCheckIn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(checkInInput)
  .handler(async ({ data, context }) => {
    const { date, ...fields } = data;
    const [row] = await db
      .insert(checkIn)
      .values({ userId: context.userId, date, ...fields })
      .onConflictDoUpdate({
        target: [checkIn.userId, checkIn.date],
        targetWhere: sql`${checkIn.deletedAt} is null`, // must match the partial unique index
        set: { ...fields, updatedAt: new Date() }, // $onUpdate doesn't fire on upserts
      })
      .returning();
    return row;
  });

export const getMultipleCheckIn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ count: z.number().int().min(1).max(366) }))
  .handler(async ({ data: { count }, context: { userId } }) => {
    // Most recent first.
    const checkInRows = await db
      .select()
      .from(checkIn)
      .where(and(eq(checkIn.userId, userId), isNull(checkIn.deletedAt)))
      .limit(count)
      .orderBy(desc(checkIn.date));

    // Plus each day's workouts and health events (linked by date).
    return {
      checkIns: await withDayEntries(userId, checkInRows, {
        dates: checkInRows.map((c) => c.date),
      }),
    };
  });

/**
 * Check-ins between two dates, inclusive. Newest first. Days without one are simply absent.
 * Each comes with that day's workouts and health events (linked by date).
 */
export const getCheckInRange = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z
      .object({ from: isoDate, to: isoDate })
      // ISO strings compare like dates.
      .refine((v) => v.from <= v.to, {
        message: "`from` must be on or before `to`",
      }),
  )
  .handler(async ({ data: { from, to }, context: { userId } }) => {
    const checkIns = await db
      .select()
      .from(checkIn)
      .where(
        and(
          eq(checkIn.userId, userId),
          gte(checkIn.date, from),
          lte(checkIn.date, to),
          isNull(checkIn.deletedAt),
        ),
      )
      .orderBy(desc(checkIn.date));

    return { checkIns: await withDayEntries(userId, checkIns, { from, to }) };
  });
