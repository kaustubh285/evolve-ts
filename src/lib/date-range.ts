import { z } from "zod";
import { addDays } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";

/** How many days the mini-calendar shows (= how many days a "Recent" list covers). */
export const RANGE_DAYS = 7;

/**
 * `?from=2026-11-06` → first day the mini-calendar shows. In the URL so
 * back/refresh/share keep it. Missing or invalid → undefined → default range.
 */
export const rangeSearch = z.object({
  from: isoDate.optional().catch(undefined),
});

/** The visible range: `from` (default: the last RANGE_DAYS days ending today) → `to`. */
export function resolveRange(today: string, from: string | undefined) {
  const start = from ?? addDays(today, -(RANGE_DAYS - 1));
  const to = addDays(start, RANGE_DAYS - 1);
  return { from: start, to, includesToday: start <= today && today <= to };
}
