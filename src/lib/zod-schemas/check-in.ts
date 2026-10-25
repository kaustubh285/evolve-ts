import { z } from "zod";
import { isoDate, optionalInt, optionalText } from "./common";

export { isoDate } from "./common";

// The full check-in. Autosave sends ALL fields every time (null = empty),
// so the server can upsert the whole row without merging.
export const checkInInput = z
  .object({
    date: isoDate,

    sleepStart: z.date().nullable(),
    sleepEnd: z.date().nullable(),
    sleepQuality: optionalInt(1, 5),

    meal: optionalText(2000),
    proteinAtBreakfast: z.boolean().nullable(),
    proteinAtLunch: z.boolean().nullable(),
    proteinAtDinner: z.boolean().nullable(),

    steps: optionalInt(0, 200_000),
    notes: optionalText(5000),
  })
  .refine(
    (v) => !v.sleepStart || !v.sleepEnd || v.sleepEnd > v.sleepStart,
    { path: ["sleepEnd"], message: "Wake-up must be after bedtime" },
  );

export type CheckInInput = z.input<typeof checkInInput>;
