import assert from "node:assert/strict";
import { test } from "node:test";
import { dueDatesFor, nextDueDate, type RecurringRuleLike } from "./recurring.ts";

function rule(overrides: Partial<RecurringRuleLike>): RecurringRuleLike {
  return {
    frequency: "monthly",
    dayOfMonth: 5,
    weekday: null,
    startsOn: "2026-07-01",
    lastGeneratedOn: null,
    ...overrides,
  };
}

test("monthly rules fill every month since the start", () => {
  assert.deepEqual(dueDatesFor(rule({}), "2026-09-14"), [
    "2026-07-05",
    "2026-08-05",
    "2026-09-05",
  ]);
});

test("monthly rules only continue past the last generated date", () => {
  assert.deepEqual(dueDatesFor(rule({ lastGeneratedOn: "2026-08-05" }), "2026-09-14"), [
    "2026-09-05",
  ]);
});

test("a rule starting on its due date still fires that day", () => {
  assert.deepEqual(dueDatesFor(rule({ startsOn: "2026-09-05" }), "2026-09-14"), ["2026-09-05"]);
});

test("day 31 falls back to the last day of shorter months", () => {
  assert.deepEqual(
    dueDatesFor(rule({ dayOfMonth: 31, startsOn: "2026-01-01" }), "2026-04-02"),
    ["2026-01-31", "2026-02-28", "2026-03-31"]
  );
});

test("weekly rules land on the chosen weekday", () => {
  assert.deepEqual(
    dueDatesFor(
      rule({ frequency: "weekly", dayOfMonth: null, weekday: 1, startsOn: "2026-09-01" }),
      "2026-09-14"
    ),
    ["2026-09-07", "2026-09-14"]
  );
});

test("nothing is due when the rule is in the future or already up to date", () => {
  assert.deepEqual(dueDatesFor(rule({ startsOn: "2026-10-01" }), "2026-09-14"), []);
  assert.deepEqual(dueDatesFor(rule({ lastGeneratedOn: "2026-09-05" }), "2026-09-14"), []);
});

test("a long neglected rule only backfills the last year", () => {
  const dates = dueDatesFor(rule({ startsOn: "2019-01-01" }), "2026-09-14");
  assert.equal(dates[0], "2025-09-05");
  assert.equal(dates[dates.length - 1], "2026-09-05");
  assert.equal(dates.length, 13);
});

test("next due date looks forward, not back", () => {
  assert.equal(nextDueDate(rule({ dayOfMonth: 5 }), "2026-09-14"), "2026-10-05");
  assert.equal(nextDueDate(rule({ dayOfMonth: 20 }), "2026-09-14"), "2026-09-20");
  assert.equal(nextDueDate(rule({ dayOfMonth: 31 }), "2026-09-14"), "2026-09-30");
});

test("next due date respects a future start", () => {
  assert.equal(
    nextDueDate(rule({ dayOfMonth: 5, startsOn: "2026-11-10" }), "2026-09-14"),
    "2026-12-05"
  );
  assert.equal(
    nextDueDate(rule({ frequency: "weekly", dayOfMonth: null, weekday: 1, startsOn: "2026-10-26" }), "2026-09-14"),
    "2026-10-26"
  );
});

test("next weekly due date is the coming chosen weekday", () => {
  assert.equal(
    nextDueDate(rule({ frequency: "weekly", dayOfMonth: null, weekday: 1 }), "2026-09-14"),
    "2026-09-21"
  );
  assert.equal(
    nextDueDate(rule({ frequency: "weekly", dayOfMonth: null, weekday: 0 }), "2026-09-14"),
    "2026-09-20"
  );
});
