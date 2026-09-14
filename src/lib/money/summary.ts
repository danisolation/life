import type { CategoryKind } from "@/lib/db/schema";

export type TransactionLike = {
  id: string;
  kind: CategoryKind;
  categoryId: string | null;
  amountMinor: number;
  occurredOn: string;
  note: string | null;
};

export type CategoryLike = { id: string; name: string };

export type CategoryTotal = {
  categoryId: string | null;
  name: string;
  totalMinor: number;
  count: number;
};

export type MonthSummary = {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  savingsRate: number;
  byCategory: CategoryTotal[];
  transactionCount: number;
  avgPerDayMinor: number;
};

export function summarize(
  transactions: TransactionLike[],
  categories: CategoryLike[],
  options: { month: string; daysElapsed: number }
): MonthSummary {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  let incomeMinor = 0;
  let expenseMinor = 0;
  const expenseByCategory = new Map<string | null, CategoryTotal>();

  for (const transaction of transactions) {
    if (transaction.kind === "income") {
      incomeMinor += transaction.amountMinor;
      continue;
    }

    expenseMinor += transaction.amountMinor;
    const key =
      transaction.categoryId && nameById.has(transaction.categoryId)
        ? transaction.categoryId
        : null;
    const row = expenseByCategory.get(key) ?? {
      categoryId: key,
      name: key ? (nameById.get(key) as string) : "Uncategorized",
      totalMinor: 0,
      count: 0,
    };
    row.totalMinor += transaction.amountMinor;
    row.count += 1;
    expenseByCategory.set(key, row);
  }

  const netMinor = incomeMinor - expenseMinor;

  return {
    month: options.month,
    incomeMinor,
    expenseMinor,
    netMinor,
    savingsRate: incomeMinor > 0 ? netMinor / incomeMinor : 0,
    byCategory: [...expenseByCategory.values()].sort((a, b) => b.totalMinor - a.totalMinor),
    transactionCount: transactions.length,
    avgPerDayMinor: options.daysElapsed > 0 ? Math.round(expenseMinor / options.daysElapsed) : 0,
  };
}
