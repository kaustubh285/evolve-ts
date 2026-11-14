import type { checkIn } from "#/db/schema";

type CheckInRow = typeof checkIn.$inferSelect;

// Pure functions: check-in rows in → numbers out. No DB, no React — easy to test.

export type WeekStats = {
  /** Average minutes slept, over nights with both bedtime and wake-up. */
  avgSleepMin: number | null;
  /** Average steps, over days with steps filled in. */
  avgSteps: number | null;
  /** Meals with protein (each day has 3 chances). */
  proteinMeals: number;
  /** Days with a check-in at all. */
  daysCheckedIn: number;
};

const average = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

export function weekStats(rows: CheckInRow[]): WeekStats {
  const sleep = rows.flatMap((r) =>
    r.sleepStart && r.sleepEnd
      ? [(r.sleepEnd.getTime() - r.sleepStart.getTime()) / 60_000]
      : [],
  );
  const steps = rows.flatMap((r) => (r.steps != null ? [r.steps] : []));
  const proteinMeals = rows.reduce(
    (n, r) =>
      n +
      Number(!!r.proteinAtBreakfast) +
      Number(!!r.proteinAtLunch) +
      Number(!!r.proteinAtDinner),
    0,
  );

  return {
    avgSleepMin: average(sleep),
    avgSteps: average(steps),
    proteinMeals,
    daysCheckedIn: rows.length,
  };
}

/** Change from `prev` to `curr`; null when either side has no data. */
export function delta(curr: number | null, prev: number | null) {
  return curr == null || prev == null ? null : curr - prev;
}
