import assert from "node:assert/strict";
import { test } from "node:test";
import { forecast } from "./forecast.ts";

test("projects the rest of the month from the pace so far", () => {
  const result = forecast({
    expenseMinor: 15_000_000,
    incomeMinor: 40_000_000,
    daysElapsed: 15,
    daysInMonth: 30,
    committedMinor: 6_000_000,
  });

  assert.equal(result.daysLeft, 15);
  assert.equal(result.paceMinor, 15_000_000);
  assert.equal(result.projectedExpenseMinor, 36_000_000);
  assert.equal(result.projectedNetMinor, 4_000_000);
});

test("on the last day nothing is projected from pace", () => {
  const result = forecast({
    expenseMinor: 20_000_000,
    incomeMinor: 25_000_000,
    daysElapsed: 30,
    daysInMonth: 30,
    committedMinor: 0,
  });

  assert.equal(result.daysLeft, 0);
  assert.equal(result.paceMinor, 0);
  assert.equal(result.projectedExpenseMinor, 20_000_000);
});

test("a month with no spending yet only carries what is committed", () => {
  const result = forecast({
    expenseMinor: 0,
    incomeMinor: 10_000_000,
    daysElapsed: 3,
    daysInMonth: 31,
    committedMinor: 6_000_000,
  });

  assert.equal(result.paceMinor, 0);
  assert.equal(result.projectedExpenseMinor, 6_000_000);
  assert.equal(result.projectedNetMinor, 4_000_000);
});

test("committed money is added on top of the pace", () => {
  const result = forecast({
    expenseMinor: 1_000_000,
    incomeMinor: 2_000_000,
    daysElapsed: 10,
    daysInMonth: 20,
    committedMinor: 500_000,
  });

  assert.equal(result.paceMinor, 1_000_000);
  assert.equal(result.projectedExpenseMinor, 2_500_000);
  assert.equal(result.projectedNetMinor, -500_000);
});
