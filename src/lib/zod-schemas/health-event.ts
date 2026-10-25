import { z } from "zod";
import { isoDate, optionalInt, optionalText } from "./common";

// Also used by the DB enum in db/schema/health_event.ts — one list, no drift.
// Adding a value here needs `bun db:generate` (it becomes ALTER TYPE ... ADD VALUE).
export const HEALTH_EVENT_TYPES = [
  "migraine",
  "acid_reflux",
  "sinusitis",
  "sore_throat",
  "stomach_ache",
  "back_pain",
  "headache",
] as const;

export const healthEventInput = z
  .object({
    id: z.uuid().optional(),
    date: isoDate,

    type: z.enum(HEALTH_EVENT_TYPES),
    startedAt: z.date().nullable(),
    endedAt: z.date().nullable(), // null = ongoing / unknown
    severity: optionalInt(1, 10),
    medication: optionalText(500),
    notes: optionalText(2000),
  })
  .refine((v) => !v.startedAt || !v.endedAt || v.endedAt >= v.startedAt, {
    path: ["endedAt"],
    message: "End must be after start",
  });

export type HealthEventInput = z.input<typeof healthEventInput>;
