import assert from "node:assert/strict";
import { it } from "node:test";
import { dateInZone } from "./dates";

it("dateInZone: the calendar day in that zone, not UTC", () => {
  const t = new Date("2026-11-14T23:30:00Z");
  assert.equal(dateInZone(t, "Europe/London"), "2026-11-14"); // GMT in Nov
  assert.equal(dateInZone(t, "Asia/Kolkata"), "2026-11-15"); // UTC+5:30
  assert.equal(dateInZone(new Date("2026-07-01T23:30:00Z"), "Europe/London"), "2026-07-02"); // BST
});
