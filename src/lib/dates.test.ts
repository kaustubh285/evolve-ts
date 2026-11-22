import assert from "node:assert/strict";
import { it } from "node:test";
import { dateInZone, fromDateTimeLocal, toDateTimeLocal } from "./dates";

it("dateInZone: the calendar day in that zone, not UTC", () => {
  const t = new Date("2026-11-14T23:30:00Z");
  assert.equal(dateInZone(t, "Europe/London"), "2026-11-14"); // GMT in Nov
  assert.equal(dateInZone(t, "Asia/Kolkata"), "2026-11-15"); // UTC+5:30
  assert.equal(
    dateInZone(new Date("2026-07-01T23:30:00Z"), "Europe/London"),
    "2026-07-02",
  ); // BST
});

it("datetime-local round trip in London, across the BST change", () => {
  const winter = fromDateTimeLocal("2026-11-14T22:00", "Europe/London");
  assert.equal(winter?.toISOString(), "2026-11-14T22:00:00.000Z"); // GMT
  const summer = fromDateTimeLocal("2026-07-01T22:00", "Europe/London");
  assert.equal(summer?.toISOString(), "2026-07-01T21:00:00.000Z"); // BST
  assert.equal(
    toDateTimeLocal(summer as Date, "Europe/London"),
    "2026-07-01T22:00",
  );
  assert.equal(fromDateTimeLocal("", "Europe/London"), null);
});
