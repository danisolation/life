import type { MonthSummary } from "./summary";

export type BudgetStatus = {
  pct: number;
  remainingMinor: number;
  tone: "ok" | "warn" | "over";
};

export type BudgetLine = {
  categoryId: string;
  name: string;
  spentMinor: number;
  limitMinor: number;
  status: BudgetStatus;
};

export function budgetStatus(spentMinor: number, limitMinor: number): BudgetStatus {
  if (limitMinor <= 0) {
    return spentMinor > 0
      ? { pct: 100, remainingMinor: -spentMinor, tone: "over" }
      : { pct: 0, remainingMinor: 0, tone: "ok" };
  }

  const pct = Math.round((spentMinor / limitMinor) * 100);
  const tone = spentMinor > limitMinor ? "over" : pct >= 80 ? "warn" : "ok";

  return { pct, remainingMinor: limitMinor - spentMinor, tone };
}

export function budgetLines(
  summary: MonthSummary,
  budgets: { categoryId: string; amountMinor: number }[]
): BudgetLine[] {
  return budgets
    .map((budget) => {
      const row = summary.byCategory.find((item) => item.categoryId === budget.categoryId);
      const spentMinor = row?.totalMinor ?? 0;

      return {
        categoryId: budget.categoryId,
        name: row?.name ?? "Category",
        spentMinor,
        limitMinor: budget.amountMinor,
        status: budgetStatus(spentMinor, budget.amountMinor),
      };
    })
    .sort((a, b) => b.status.pct - a.status.pct);
}
