import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInsights } from "./insights.ts";
import { budgetLines } from "./budget.ts";
import { summarize, type TransactionLike } from "./summary.ts";

const categories = [
  { id: "food", name: "Food & Drinks" },
  { id: "rent", name: "Rent" },
  { id: "salary", name: "Salary" },
];

const food = (amountMinor: number, occurredOn: string): TransactionLike => ({
  id: `${occurredOn}-${amountMinor}`,
  kind: "expense",
  categoryId: "food",
  amountMinor,
  occurredOn,
  note: null,
});

test("flags a negative savings rate as critical", () => {
  const transactions: TransactionLike[] = [
    { id: "i", kind: "income", categoryId: "salary", amountMinor: 1_000_000, occurredOn: "2026-09-01", note: null },
    food(2_000_000, "2026-09-02"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({ summary, previous: null, budgets: [], transactions, today: "2026-09-10" });

  assert.equal(insights.find((row) => row.id === "savings-rate")?.severity, "critical");
});

test("flags over-budget categories and stays quiet on healthy ones", () => {
  const transactions = [
    food(900_000, "2026-09-02"),
    food(300_000, "2026-09-03"),
    food(100_000, "2026-09-04"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const budgets = budgetLines(summary, [
    { categoryId: "food", amountMinor: 1_000_000 },
    { categoryId: "rent", amountMinor: 5_000_000 },
  ]);
  const insights = buildInsights({ summary, previous: null, budgets, transactions, today: "2026-09-10" });

  assert.equal(insights.find((row) => row.id === "budget-over:food")?.severity, "critical");
  assert.equal(insights.find((row) => row.id === "budget-warn:rent"), undefined);
});

test("flags a category spike against the previous month", () => {
  const previousRows = [food(100_000, "2026-08-05")];
  const currentRows = [food(600_000, "2026-09-05")];
  const previous = summarize(previousRows, categories, { month: "2026-08", daysElapsed: 31 });
  const summary = summarize(currentRows, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({
    summary,
    previous,
    budgets: [],
    transactions: [...previousRows, ...currentRows],
    today: "2026-09-10",
  });

  assert.equal(insights.find((row) => row.id === "category-spike:food")?.severity, "warning");
});

test("reports monthly commitments for three consecutive months", () => {
  const transactions = [
    food(1_000_000, "2026-07-05"),
    food(1_200_000, "2026-08-05"),
    food(1_100_000, "2026-09-05"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({ summary, previous: null, budgets: [], transactions, today: "2026-09-10" });

  assert.equal(insights.find((row) => row.id === "commitments:food")?.amountMinor, 1_100_000);
});

test("pace compares with the same days of the previous month", () => {
  const currentRows = [food(300_000, "2026-09-03"), food(200_000, "2026-09-08")];
  const previousRows = [food(200_000, "2026-08-04")];
  const summary = summarize(currentRows, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({
    summary,
    previous: null,
    budgets: [],
    transactions: [...previousRows, ...currentRows],
    today: "2026-09-10",
  });

  assert.equal(insights.find((row) => row.id === "pace")?.severity, "warning");
});

test("flags an unusually large transaction", () => {
  const rows = [food(100_000, "2026-09-02"), food(120_000, "2026-09-03"), food(900_000, "2026-09-04")];
  const summary = summarize(rows, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({ summary, previous: null, budgets: [], transactions: rows, today: "2026-09-10" });
  const outlier = insights.find((row) => row.id.startsWith("outlier:"));

  assert.equal(outlier?.severity, "warning");
  assert.equal(outlier?.amountMinor, 900_000);
});

test("puts critical insights first and never repeats a severity after a lower one", () => {
  const transactions: TransactionLike[] = [
    { id: "i", kind: "income", categoryId: "salary", amountMinor: 1_000_000, occurredOn: "2026-09-01", note: null },
    food(900_000, "2026-09-02"),
    food(300_000, "2026-09-03"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const budgets = budgetLines(summary, [{ categoryId: "food", amountMinor: 1_000_000 }]);
  const insights = buildInsights({ summary, previous: null, budgets, transactions, today: "2026-09-10" });

  assert.equal(insights[0].severity, "critical");
  const order = ["critical", "warning", "info"];
  const indexes = insights.map((row) => order.indexOf(row.severity));
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
});
