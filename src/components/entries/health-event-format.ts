import { timeInZone } from "#/lib/dates";
import type { HEALTH_EVENT_TYPES } from "#/lib/zod-schemas/health-event";
import type { HealthEvent } from "./types";

export type HealthEventType = (typeof HEALTH_EVENT_TYPES)[number];

// Record<HealthEventType, …> → TypeScript errors here if a type is added to
// the list without a label.
export const HEALTH_EVENT_LABELS: Record<HealthEventType, string> = {
  migraine: "Migraine",
  acid_reflux: "Acid reflux",
  sinusitis: "Sinusitis",
  sore_throat: "Sore throat",
  stomach_ache: "Stomach ache",
  back_pain: "Back pain",
  headache: "Headache",
};

/** "14:00–16:30", "14:00–02:00 (+1d)", "from 14:00", or null. */
export function formatEventTime(e: HealthEvent, timeZone: string) {
  if (!e.startedAt)
    return e.endedAt ? `until ${timeInZone(e.endedAt, timeZone)}` : null;
  const start = timeInZone(e.startedAt, timeZone);
  if (!e.endedAt) return `from ${start}`;
  const end = timeInZone(e.endedAt, timeZone);
  const nextDay =
    e.endedAt.getTime() - e.startedAt.getTime() >= 24 * 3600_000 || end < start;
  return `${start}–${end}${nextDay ? " (+1d)" : ""}`;
}
