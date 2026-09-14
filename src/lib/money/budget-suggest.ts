export type CategoryMonthTotal = { month: string; categoryId: string; totalMinor: number };

export type BudgetSuggestion = { categoryId: string; amountMinor: number };

export function suggestBudgets(
  rows: CategoryMonthTotal[],
  options: { stepMinor: number }
): BudgetSuggestion[] {
  const { stepMinor } = options;
  if (!rows.length || stepMinor <= 0) return [];

  const perCategory = new Map<string, number[]>();
  for (const row of rows) {
    perCategory.set(row.categoryId, [...(perCategory.get(row.categoryId) ?? []), row.totalMinor]);
  }

  const suggestions: BudgetSuggestion[] = [];
  for (const [categoryId, monthly] of perCategory) {
    const sorted = [...monthly].sort((a, b) => a - b);
    const median = sorted[Math.floor((sorted.length - 1) / 2)];
    if (median <= 0) continue;

    const rounded = Math.ceil(median / stepMinor) * stepMinor;
    suggestions.push({ categoryId, amountMinor: Math.max(rounded, stepMinor) });
  }

  return suggestions.sort((a, b) => b.amountMinor - a.amountMinor);
}
