import { createFormContext } from "@mantine/form";
import type { checkIn as checkInTable } from "#/db/schema";
import { addDays, timeInZone, zonedDateTime } from "#/lib/dates";
import type { CheckInInput } from "#/lib/zod-schemas/check-in";

export type CheckInRow = typeof checkInTable.$inferSelect;

// What the inputs hold. Empty text/time is "", empty number is "" (Mantine's NumberInput).
// Converting to the server shape (null = empty, times → Date) happens when we save.
export type CheckInFormValues = {
  sleepStart: string; // "HH:MM", the night before (or after midnight)
  sleepEnd: string; // "HH:MM", the morning of `date`
  sleepQuality: number | null; // no input yet; carried so saving doesn't wipe it
  meal: string;
  proteinAtBreakfast: boolean;
  proteinAtLunch: boolean;
  proteinAtDinner: boolean;
  steps: number | string;
  notes: string;
};

export function toFormValues(
  row: CheckInRow | null,
  timeZone: string,
): CheckInFormValues {
  return {
    sleepStart: row?.sleepStart ? timeInZone(row.sleepStart, timeZone) : "",
    sleepEnd: row?.sleepEnd ? timeInZone(row.sleepEnd, timeZone) : "",
    sleepQuality: row?.sleepQuality ?? null,
    meal: row?.meal ?? "",
    proteinAtBreakfast: row?.proteinAtBreakfast ?? false,
    proteinAtLunch: row?.proteinAtLunch ?? false,
    proteinAtDinner: row?.proteinAtDinner ?? false,
    steps: row?.steps ?? "",
    notes: row?.notes ?? "",
  };
}

/**
 * Sleep rule: the check-in for D covers the night ending on the morning of D.
 * Wake-up is always on D. Bedtime is on D-1 when it's later than wake-up
 * (23:30 → 07:10), and on D when it's after midnight (00:30 → 07:10).
 * With no wake-up yet, a bedtime from noon onwards counts as the evening before.
 */
function bedtimeDate(date: string, start: string, end: string): string {
  const eveningBefore = end ? start > end : start >= "12:00";
  return eveningBefore ? addDays(date, -1) : date;
}

/** Form values → what saveCheckIn expects ("" → null, "HH:MM" → Date). */
export function toServerValues(
  values: CheckInFormValues,
  date: string,
  timeZone: string,
): CheckInInput {
  const { sleepStart, sleepEnd, steps } = values;
  return {
    date,
    sleepStart: sleepStart
      ? zonedDateTime(
          bedtimeDate(date, sleepStart, sleepEnd),
          sleepStart,
          timeZone,
        )
      : null,
    sleepEnd: sleepEnd ? zonedDateTime(date, sleepEnd, timeZone) : null,
    sleepQuality: values.sleepQuality,
    meal: values.meal,
    proteinAtBreakfast: values.proteinAtBreakfast,
    proteinAtLunch: values.proteinAtLunch,
    proteinAtDinner: values.proteinAtDinner,
    steps: typeof steps === "number" ? steps : null,
    notes: values.notes,
  };
}

// Field components read the form from context instead of a `form` prop,
// so they can be dropped into the check-in page or the quick-add drawer.
export const [CheckInFormProvider, useCheckInFormContext, useCheckInForm] =
  createFormContext<CheckInFormValues>();
