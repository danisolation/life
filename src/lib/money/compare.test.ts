import assert from "node:assert/strict";
import { test } from "node:test";
import { compareMonths } from "./compare.ts";
import type { MonthSummary } from "./summary.ts";

function summary(overrides: Partial<MonthSummary>): MonthSummary {
  return {
    month: "2026-09",
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    savingsRate: 0,
    byCategory: [],
    transactionCount: 0,
    avgPerDayMinor: 0,
    ...overrides,
  };
}

test("compareMonths reports deltas and pct", () => {
  const current = summary({
    month: "2026-09",
    incomeMinor: 20_000_000,
    expenseMinor: 12_000_000,
    savingsRate: 0.4,
  });
  const previous = summary({
    month: "2026-08",
    incomeMinor: 10_000_000,
    expenseMinor: 10_000_000,
    savingsRate: 0,
  });

  const comparison = compareMonths(current, previous);
  assert.equal(comparison.expenseDeltaMinor, 2_000_000);
  assert.equal(comparison.expenseDeltaPct, 20);
  assert.equal(comparison.incomeDeltaPct, 100);
  assert.equal(comparison.savingsRateDelta, 0.4);
});

test("compareMonths returns null pct when previous month is zero", () => {
  const comparison = compareMonths(summary({ expenseMinor: 500_000 }), summary({}));
  assert.equal(comparison.expenseDeltaPct, null);
  assert.equal(comparison.expenseDeltaMinor, 500_000);
});

test("movers are sorted by absolute delta and capped at 5", () => {
  const current = summary({
    byCategory: [
      { categoryId: "a", name: "A", totalMinor: 100_000, count: 1 },
      { categoryId: "b", name: "B", totalMinor: 900_000, count: 1 },
      { categoryId: "c", name: "C", totalMinor: 300_000, count: 1 },
      { categoryId: "d", name: "D", totalMinor: 400_000, count: 1 },
      { categoryId: "e", name: "E", totalMinor: 500_000, count: 1 },
      { categoryId: "f", name: "F", totalMinor: 600_000, count: 1 },
    ],
  });
  const previous = summary({
    byCategory: [
      { categoryId: "a", name: "A", totalMinor: 1_000_000, count: 1 },
      { categoryId: "b", name: "B", totalMinor: 0, count: 0 },
      { categoryId: "c", name: "C", totalMinor: 0, count: 0 },
      { categoryId: "d", name: "D", totalMinor: 0, count: 0 },
      { categoryId: "e", name: "E", totalMinor: 0, count: 0 },
      { categoryId: "f", name: "F", totalMinor: 0, count: 0 },
    ],
  });

  const comparison = compareMonths(current, previous);
  assert.equal(comparison.movers.length, 5);
  assert.equal(comparison.movers[0].categoryId, "a");
  assert.equal(comparison.movers[0].deltaPct, -90);
});
