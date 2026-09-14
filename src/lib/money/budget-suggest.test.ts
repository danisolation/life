import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestBudgets, type CategoryMonthTotal } from "./budget-suggest.ts";

const rows: CategoryMonthTotal[] = [
  { month: "2026-07", categoryId: "food", totalMinor: 5_000_000 },
  { month: "2026-08", categoryId: "food", totalMinor: 6_000_000 },
  { month: "2026-09", categoryId: "food", totalMinor: 7_000_000 },
  { month: "2026-07", categoryId: "rent", totalMinor: 6_000_000 },
  { month: "2026-08", categoryId: "rent", totalMinor: 6_000_000 },
];

test("suggests the median rounded up to the step", () => {
  const suggestions = suggestBudgets(rows, { stepMinor: 100_000 });
  assert.deepEqual(suggestions, [
    { categoryId: "food", amountMinor: 6_000_000 },
    { categoryId: "rent", amountMinor: 6_000_000 },
  ]);
});

test("a month with no spending does not create a suggestion on its own", () => {
  const suggestions = suggestBudgets(
    [
      { month: "2026-08", categoryId: "health", totalMinor: 900_000 },
      { month: "2026-09", categoryId: "health", totalMinor: 0 },
    ],
    { stepMinor: 100_000 }
  );

  assert.deepEqual(suggestions, []);
});

test("a one-off purchase does not become the budget", () => {
  const suggestions = suggestBudgets(
    [
      { month: "2026-06", categoryId: "shopping", totalMinor: 25_000_000 },
      { month: "2026-07", categoryId: "shopping", totalMinor: 1_156_000 },
    ],
    { stepMinor: 100_000 }
  );

  assert.deepEqual(suggestions, [{ categoryId: "shopping", amountMinor: 1_200_000 }]);
});

test("rounds up rather than down so the budget is not tight", () => {
  const suggestions = suggestBudgets(
    [{ month: "2026-09", categoryId: "food", totalMinor: 6_050_000 }],
    { stepMinor: 100_000 }
  );

  assert.deepEqual(suggestions, [{ categoryId: "food", amountMinor: 6_100_000 }]);
});

test("always suggests at least one step", () => {
  const suggestions = suggestBudgets(
    [{ month: "2026-09", categoryId: "food", totalMinor: 12_000 }],
    { stepMinor: 100_000 }
  );

  assert.deepEqual(suggestions, [{ categoryId: "food", amountMinor: 100_000 }]);
});

test("stays quiet without history or a usable step", () => {
  assert.deepEqual(suggestBudgets([], { stepMinor: 100_000 }), []);
  assert.deepEqual(suggestBudgets(rows, { stepMinor: 0 }), []);
});
