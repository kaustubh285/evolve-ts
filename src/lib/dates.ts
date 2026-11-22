// Shared by client and server — keep this file free of server-only imports.
//
// Dates are ISO strings everywhere — code, DB (`date` columns) and URLs: "2026-10-25".
//
// Everything that ends up in rendered HTML is built by hand from numbers.
// Node and browsers ship different locale data, so `toLocaleDateString` can
// print "Sun, 25 Oct" on the server and "Sun 25 Oct" in Chrome → hydration error.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in a given IANA timezone, as ISO. */
export function todayIso(timeZone: string): string {
  return dateInZone(new Date(), timeZone);
}

/** The calendar day a timestamp falls on in `timeZone`, as ISO. 23:30 UTC can be tomorrow in Asia. */
export function dateInZone(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-10-25" + 1 → "2026-10-26". Pure calendar math, no timezone involved. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-25" → "Sun 25 Oct" */
export function formatIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// ── Wall-clock time in a fixed timezone ────────────────────────────────────
// Server (UTC) and browser must show the same "23:30" for a timestamp,
// otherwise SSR and hydration disagree. So we always convert in APP_TIMEZONE.

/** Timestamp → "HH:MM" as seen in `timeZone`. */
export function timeInZone(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** ("2026-10-25", "07:10") in `timeZone` → the real timestamp (Date). */
export function zonedDateTime(
  iso: string,
  hhmm: string,
  timeZone: string,
): Date {
  // Pretend the wall-clock time is UTC, then shift by the zone's offset at that moment.
  const asUtc = new Date(`${iso}T${hhmm}:00Z`);
  return new Date(asUtc.getTime() - zoneOffsetMs(asUtc, timeZone));
}

/** Timestamp → "2026-11-14T22:00" in `timeZone` — the value a <input type="datetime-local"> takes. */
export function toDateTimeLocal(date: Date, timeZone: string): string {
  return `${dateInZone(date, timeZone)}T${timeInZone(date, timeZone)}`;
}

/** "2026-11-14T22:00" (datetime-local input) in `timeZone` → the real timestamp, or null if malformed. */
export function fromDateTimeLocal(
  value: string,
  timeZone: string,
): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? zonedDateTime(m[1], m[2], timeZone) : null;
}

/** How far ahead of UTC `timeZone` is at `date` (e.g. +1h for London in summer). */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return wallAsUtc - date.getTime();
}

/** The calendar/clock numbers of `date` as seen in `timeZone`. Numbers only — locale-proof. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}
