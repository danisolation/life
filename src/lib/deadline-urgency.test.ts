import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, startOfToday, urgencyOf } from "./deadline-urgency.ts";

test("startOfToday zeroes the time component", () => {
  const result = startOfToday(new Date(2026, 8, 12, 17, 43, 21, 500));
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 8);
  assert.equal(result.getDate(), 12);
  assert.equal(result.getHours(), 0);
  assert.equal(result.getMinutes(), 0);
  assert.equal(result.getSeconds(), 0);
  assert.equal(result.getMilliseconds(), 0);
});

test("daysUntil returns 0 for a time later today", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 12, 23, 30, 0), today), 0);
});

test("daysUntil returns 1 for tomorrow", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 13, 0, 0, 1), today), 1);
});

test("daysUntil returns -1 for yesterday", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 11, 23, 59, 59), today), -1);
});

test("daysUntil accepts an ISO string", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  const iso = new Date(2026, 8, 15, 12, 0, 0).toISOString();
  assert.equal(daysUntil(iso, today), 3);
});

test("daysUntil crosses a month boundary", () => {
  const today = startOfToday(new Date(2026, 8, 30, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 9, 2, 9, 0, 0), today), 2);
});

test("daysUntil counts calendar days, not elapsed milliseconds", () => {
  // A local day is not always 24 hours. Two consecutive local noons are one
  // calendar day apart even when the day between them is 23 or 25 hours long.
  const today = startOfToday(new Date(2026, 2, 7, 12, 0, 0));
  assert.equal(daysUntil(new Date(2026, 2, 8, 12, 0, 0), today), 1);
  assert.equal(daysUntil(new Date(2026, 2, 9, 12, 0, 0), today), 2);
});

test("urgencyOf buckets by distance", () => {
  assert.equal(urgencyOf(-5), "overdue");
  assert.equal(urgencyOf(-1), "overdue");
  assert.equal(urgencyOf(0), "today");
  assert.equal(urgencyOf(1), "soon");
  assert.equal(urgencyOf(7), "soon");
  assert.equal(urgencyOf(8), "later");
  assert.equal(urgencyOf(365), "later");
});
