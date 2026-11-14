import assert from "node:assert/strict";
import { it } from "node:test";
import { parseDuration } from "./workout-form";

it("parseDuration: m:ss, h:mm:ss, plain minutes, junk", () => {
  assert.equal(parseDuration("9:45"), 585);
  assert.equal(parseDuration("1:02:30"), 3750);
  assert.equal(parseDuration("45"), 2700);
  assert.equal(parseDuration(" "), null);
  assert.equal(parseDuration("fast"), null);
  assert.equal(parseDuration("9:"), null);
});
