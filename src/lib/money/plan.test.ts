import assert from "node:assert/strict";
import { test } from "node:test";
import { monthPlan, planVariance } from "./plan.ts";

const kinds = {
  salary: "income" as const,
  bonus: "income" as const,
  food: "expense" as const,
  rent: "expense" as const,
};

test("adds budgets up per kind and works out what is left", () => {
  const plan = monthPlan({
    budgets: [
      { categoryId: "salary", amountMinor: 20_000_000 },
      { categoryId: "food", amountMinor: 5_000_000 },
      { categoryId: "rent", amountMinor: 6_000_000 },
    ],
    kinds,
  });

  assert.deepEqual(plan, {
    incomeMinor: 20_000_000,
    expenseMinor: 11_000_000,
    leftOverMinor: 9_000_000,
    hasIncomePlan: true,
    hasExpensePlan: true,
  });
});

test("an expense-only plan has nothing to subtract from", () => {
  const plan = monthPlan({ budgets: [{ categoryId: "food", amountMinor: 5_000_000 }], kinds });
  assert.equal(plan.incomeMinor, 0);
  assert.equal(plan.hasIncomePlan, false);
  assert.equal(plan.leftOverMinor, -5_000_000);
});

test("budgets for categories that no longer exist are ignored", () => {
  const plan = monthPlan({
    budgets: [
      { categoryId: "deleted", amountMinor: 1_000_000 },
      { categoryId: "salary", amountMinor: 9_000_000 },
    ],
    kinds,
  });

  assert.equal(plan.incomeMinor, 9_000_000);
  assert.equal(plan.expenseMinor, 0);
});

test("an empty plan knows it is empty", () => {
  assert.deepEqual(monthPlan({ budgets: [], kinds }), {
    incomeMinor: 0,
    expenseMinor: 0,
    leftOverMinor: 0,
    hasIncomePlan: false,
    hasExpensePlan: false,
  });
});

test("variance compares the month against the plan", () => {
  const plan = monthPlan({
    budgets: [
      { categoryId: "salary", amountMinor: 20_000_000 },
      { categoryId: "food", amountMinor: 5_000_000 },
    ],
    kinds,
  });

  const ahead = planVariance(plan, { netMinor: 17_000_000 });
  assert.equal(ahead.expectedNetMinor, 15_000_000);
  assert.equal(ahead.netDeltaMinor, 2_000_000);

  const behind = planVariance(plan, { netMinor: 12_500_000 });
  assert.equal(behind.netDeltaMinor, -2_500_000);
});

test("without any plan the expectation is simply what happened", () => {
  const empty = monthPlan({ budgets: [], kinds });
  const variance = planVariance(empty, { netMinor: -3_000_000 });
  assert.equal(variance.expectedNetMinor, -3_000_000);
  assert.equal(variance.netDeltaMinor, 0);
});
