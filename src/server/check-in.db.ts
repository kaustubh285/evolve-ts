// Server-only DB helpers for check-ins. Only import from inside handlers —
// top-level code in a *.functions.ts file ships #/db to the browser (see workout.db.ts).
//
// How a check-in links to workouts and health events: by DATE, no foreign keys.
//  - workout.date      = the day it happened (Strong import: the day it started)
//  - healthEvent.date  = the day it STARTED (saveHealthEvent derives it from startedAt)
// So a check-in, a workout and a health event "belong together" when user + date match,
// and either can exist without the others.

import { db } from "#/db";
import type { checkIn } from "#/db/schema";

type CheckInRow = typeof checkIn.$inferSelect;

/** Pick dates by a range or an explicit list. */
type DateFilter = { from: string; to: string } | { dates: string[] };

/** Workouts (with sets) and health events on the given dates, for one user. */
async function entriesOn(userId: string, filter: DateFilter) {
  if ("dates" in filter && filter.dates.length === 0) {
    return { workouts: [], healthEvents: [] };
  }

  const [workouts, healthEvents] = await Promise.all([
    db.query.workout.findMany({
      where: (w, { and, eq, gte, lte, inArray, isNull }) =>
        and(
          eq(w.userId, userId),
          "dates" in filter
            ? inArray(w.date, filter.dates)
            : and(gte(w.date, filter.from), lte(w.date, filter.to)),
          isNull(w.deletedAt),
        ),
      orderBy: (w, { asc }) => [asc(w.startedAt), asc(w.createdAt)],
      with: {
        sets: {
          where: (s, { isNull }) => isNull(s.deletedAt),
          orderBy: (s, { asc }) => [asc(s.position)],
        },
      },
    }),
    db.query.healthEvent.findMany({
      where: (h, { and, eq, gte, lte, inArray, isNull }) =>
        and(
          eq(h.userId, userId),
          "dates" in filter
            ? inArray(h.date, filter.dates)
            : and(gte(h.date, filter.from), lte(h.date, filter.to)),
          isNull(h.deletedAt),
        ),
      orderBy: (h, { asc }) => [asc(h.startedAt), asc(h.createdAt)],
    }),
  ]);
  return { workouts, healthEvents };
}

/**
 * Attach each check-in's same-day workouts and health events.
 * Two queries for the whole list (not one per check-in), then grouped by date.
 */
export async function withDayEntries(
  userId: string,
  checkIns: CheckInRow[],
  filter: DateFilter,
) {
  const { workouts, healthEvents } = await entriesOn(userId, filter);

  const byDate = <T extends { date: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows)
      map.set(row.date, [...(map.get(row.date) ?? []), row]);
    return map;
  };
  const workoutsByDate = byDate(workouts);
  const healthByDate = byDate(healthEvents);

  return checkIns.map((c) => ({
    ...c,
    workouts: workoutsByDate.get(c.date) ?? [],
    healthEvents: healthByDate.get(c.date) ?? [],
  }));
}
