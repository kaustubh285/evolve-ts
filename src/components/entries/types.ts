import type { getCheckIn } from "#/server/check-in.functions";

// Row types come straight from what the server returns — no DB imports in
// client code, and they stay in sync with the schema automatically.
export type DayData = Awaited<ReturnType<typeof getCheckIn>>;
export type Transaction = DayData["transactions"][number];
export type HealthEvent = DayData["healthEvents"][number];
