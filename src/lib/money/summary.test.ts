import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize, type TransactionLike } from "./summary.ts";

const categories = [
  { id: "food", name: "Food & Drinks" },
  { id: "salary", name: "Salary" },
];

const rows: TransactionLike[] = [
  { id: "1", kind: "income", categoryId: "salary", amountMinor: 20_000_000, occurredOn: "2026-09-01", note: null },
  { id: "2", kind: "expense", categoryId: "food", amountMinor: 300_000, occurredOn: "2026-09-02", note: null },
  { id: "3", kind: "expense", categoryId: "food", amountMinor: 200_000, occurredOn: "2026-09-03", note: null },
  { id: "4", kind: "expense", categoryId: null, amountMinor: 100_000, occurredOn: "2026-09-04", note: null },
];

test("summarize totals income, expense, net and savings rate", () => {
  const summary = summarize(rows, categories, { month: "2026-09", daysElapsed: 10 });
  assert.equal(summary.incomeMinor, 20_000_000);
  assert.equal(summary.expenseMinor, 600_000);
  assert.equal(summary.netMinor, 19_400_000);
  assert.equal(summary.savingsRate, 0.97);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.avgPerDayMinor, 60_000);
});

test("summarize groups uncategorized expenses and sorts by total", () => {
  const summary = summarize(rows, categories, { month: "2026-09", daysElapsed: 10 });
  assert.deepEqual(
    summary.byCategory.map((row) => row.name),
    ["Food & Drinks", "Uncategorized"]
  );
  assert.equal(summary.byCategory[0].totalMinor, 500_000);
  assert.equal(summary.byCategory[0].count, 2);
});

test("summarize handles zero income and negative savings", () => {
  const summary = summarize(
    rows.filter((row) => row.kind === "expense"),
    categories,
    { month: "2026-09", daysElapsed: 10 }
  );
  assert.equal(summary.savingsRate, 0);
  assert.equal(summary.netMinor, -600_000);
});
