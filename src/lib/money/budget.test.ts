import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetLines, budgetStatus } from "./budget.ts";
import type { MonthSummary } from "./summary.ts";

test("budgetStatus tone boundaries", () => {
  assert.deepEqual(budgetStatus(790_000, 1_000_000), {
    pct: 79,
    remainingMinor: 210_000,
    tone: "ok",
  });
  assert.equal(budgetStatus(800_000, 1_000_000).tone, "warn");
  assert.deepEqual(budgetStatus(1_000_000, 1_000_000), {
    pct: 100,
    remainingMinor: 0,
    tone: "warn",
  });
  assert.deepEqual(budgetStatus(1_010_000, 1_000_000), {
    pct: 101,
    remainingMinor: -10_000,
    tone: "over",
  });
});

test("budgetStatus defends against a zero limit", () => {
  assert.deepEqual(budgetStatus(0, 0), { pct: 0, remainingMinor: 0, tone: "ok" });
  assert.deepEqual(budgetStatus(50_000, 0), { pct: 100, remainingMinor: -50_000, tone: "over" });
});

test("budgetLines only includes categories with a budget, sorted by pct", () => {
  const summary = {
    month: "2026-09",
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    savingsRate: 0,
    byCategory: [
      { categoryId: "food", name: "Food & Drinks", totalMinor: 900_000, count: 3 },
      { categoryId: "rent", name: "Rent", totalMinor: 2_000_000, count: 1 },
    ],
    transactionCount: 4,
    avgPerDayMinor: 0,
  } satisfies MonthSummary;

  const lines = budgetLines(summary, [
    { categoryId: "food", amountMinor: 1_000_000 },
    { categoryId: "rent", amountMinor: 5_000_000 },
  ]);

  assert.equal(lines.length, 2);
  assert.equal(lines[0].name, "Food & Drinks");
  assert.equal(lines[0].status.tone, "warn");
  assert.equal(lines[1].status.tone, "ok");
});
