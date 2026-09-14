import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysElapsed,
  daysInMonth,
  monthKey,
  monthRange,
  shiftMonth,
  todayKey,
} from "./period.ts";

test("monthKey uses local date parts", () => {
  assert.equal(monthKey(new Date(2026, 0, 5)), "2026-01");
  assert.equal(monthKey(new Date(2026, 11, 31)), "2026-12");
});

test("todayKey pads", () => {
  assert.equal(todayKey(new Date(2026, 8, 4)), "2026-09-04");
});

test("monthRange covers the whole month", () => {
  assert.deepEqual(monthRange("2026-09"), { start: "2026-09-01", end: "2026-09-30" });
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(monthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
});

test("shiftMonth crosses years", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-09", -2), "2026-07");
});

test("daysElapsed only trims the current month", () => {
  assert.equal(daysInMonth("2026-09"), 30);
  assert.equal(daysElapsed("2026-09", "2026-09-14"), 14);
  assert.equal(daysElapsed("2026-08", "2026-09-14"), 31);
  assert.equal(daysElapsed("2026-12", "2026-09-14"), 31);
});
