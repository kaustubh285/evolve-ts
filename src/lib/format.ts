// Number → text, built by hand: toLocaleString can differ between Node and
// browsers, which breaks hydration (same reason as lib/dates.ts).

/** 460 → "7h 40m" */
export const formatMinutes = (mins: number) =>
  `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;

/** 8432 → "8,432" */
export const formatThousands = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
