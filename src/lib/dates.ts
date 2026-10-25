// Shared by client and server — keep this file free of server-only imports.
//
// Dates are ISO strings everywhere — code, DB (`date` columns) and URLs: "2026-10-25".

/** Today's date in a given IANA timezone, as ISO. "en-CA" formats as yyyy-mm-dd. */
export function todayIso(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** "2026-10-25" + 1 → "2026-10-26". Pure calendar math, no timezone involved. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-25" → "Sun 25 Oct" */
export function formatIso(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ── Wall-clock time in a fixed timezone ────────────────────────────────────
// Server (UTC) and browser must show the same "23:30" for a timestamp,
// otherwise SSR and hydration disagree. So we always convert in APP_TIMEZONE.

/** Timestamp → "HH:MM" as seen in `timeZone`. */
export function timeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** ("2026-10-25", "07:10") in `timeZone` → the real timestamp (Date). */
export function zonedDateTime(iso: string, hhmm: string, timeZone: string): Date {
  // Pretend the wall-clock time is UTC, then shift by the zone's offset at that moment.
  const asUtc = new Date(`${iso}T${hhmm}:00Z`);
  return new Date(asUtc.getTime() - zoneOffsetMs(asUtc, timeZone));
}

/** How far ahead of UTC `timeZone` is at `date` (e.g. +1h for London in summer). */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallAsUtc - date.getTime();
}
