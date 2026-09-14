import type { CategoryTotal, MonthSummary } from "./summary";

export type CategoryDelta = {
  categoryId: string | null;
  name: string;
  currentMinor: number;
  previousMinor: number;
  deltaMinor: number;
  deltaPct: number | null;
};

export type MonthComparison = {
  current: MonthSummary;
  previous: MonthSummary;
  expenseDeltaMinor: number;
  expenseDeltaPct: number | null;
  incomeDeltaMinor: number;
  incomeDeltaPct: number | null;
  savingsRateDelta: number;
  movers: CategoryDelta[];
};

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function mergeCategories(current: CategoryTotal[], previous: CategoryTotal[]): CategoryDelta[] {
  const ids = new Set<string | null>([...current, ...previous].map((row) => row.categoryId));

  return [...ids].map((categoryId) => {
    const now = current.find((row) => row.categoryId === categoryId);
    const before = previous.find((row) => row.categoryId === categoryId);
    const currentMinor = now?.totalMinor ?? 0;
    const previousMinor = before?.totalMinor ?? 0;

    return {
      categoryId,
      name: now?.name ?? before?.name ?? "Uncategorized",
      currentMinor,
      previousMinor,
      deltaMinor: currentMinor - previousMinor,
      deltaPct: pctDelta(currentMinor, previousMinor),
    };
  });
}

export function compareMonths(current: MonthSummary, previous: MonthSummary): MonthComparison {
  return {
    current,
    previous,
    expenseDeltaMinor: current.expenseMinor - previous.expenseMinor,
    expenseDeltaPct: pctDelta(current.expenseMinor, previous.expenseMinor),
    incomeDeltaMinor: current.incomeMinor - previous.incomeMinor,
    incomeDeltaPct: pctDelta(current.incomeMinor, previous.incomeMinor),
    savingsRateDelta: current.savingsRate - previous.savingsRate,
    movers: mergeCategories(current.byCategory, previous.byCategory)
      .sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor))
      .slice(0, 5),
  };
}
