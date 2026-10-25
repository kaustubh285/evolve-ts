import { z } from "zod";

// Building blocks shared by every input schema.
// These run in the browser (form validation) AND on the server (.validator()),
// so this folder must only ever import zod.

/** "2026-10-25". Also rejects impossible dates like 2026-02-29. */
export const isoDate = z.iso.date();

/** Free text where "" means "not filled in" → stored as null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((s) => (s ? s : null));

/** Whole number in a range, or null (field left empty). */
export const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable();

/** For get-by-day calls. */
export const dayInput = z.object({ date: isoDate });

/** For delete calls. */
export const idInput = z.object({ id: z.uuid() });
