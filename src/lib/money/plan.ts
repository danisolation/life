export type BudgetEntry = { categoryId: string; amountMinor: number };

export type MonthPlan = {
  incomeMinor: number;
  expenseMinor: number;
  leftOverMinor: number;
  hasIncomePlan: boolean;
  hasExpensePlan: boolean;
};

export function monthPlan(input: {
  budgets: BudgetEntry[];
  kinds: Record<string, "income" | "expense">;
}): MonthPlan {
  let incomeMinor = 0;
  let expenseMinor = 0;
  let hasIncomePlan = false;
  let hasExpensePlan = false;

  for (const budget of input.budgets) {
    const kind = input.kinds[budget.categoryId];
    if (kind === "income") {
      incomeMinor += budget.amountMinor;
      hasIncomePlan = true;
    } else if (kind === "expense") {
      expenseMinor += budget.amountMinor;
      hasExpensePlan = true;
    }
  }

  return {
    incomeMinor,
    expenseMinor,
    leftOverMinor: incomeMinor - expenseMinor,
    hasIncomePlan,
    hasExpensePlan,
  };
}

export function planVariance(
  plan: MonthPlan,
  actual: { netMinor: number }
): { netDeltaMinor: number; expectedNetMinor: number } {
  const expectedNetMinor = plan.hasIncomePlan || plan.hasExpensePlan ? plan.leftOverMinor : actual.netMinor;
  return { netDeltaMinor: actual.netMinor - expectedNetMinor, expectedNetMinor };
}
