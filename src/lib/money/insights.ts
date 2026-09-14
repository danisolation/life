import type { BudgetLine } from "./budget";
import { shiftMonth } from "./period.ts";
import type { MonthSummary, TransactionLike } from "./summary";

export type InsightSeverity = "info" | "warning" | "critical";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  amountMinor?: number;
  categoryId?: string | null;
};

export type InsightInput = {
  summary: MonthSummary;
  previous: MonthSummary | null;
  budgets: BudgetLine[];
  transactions: TransactionLike[];
  today: string;
  formatAmount: (minor: number) => string;
};

const RANK: Record<InsightSeverity, number> = { critical: 3, warning: 2, info: 1 };

function savingsRate(summary: MonthSummary, previous: MonthSummary | null): Insight[] {
  if (summary.incomeMinor <= 0) return [];

  const rate = Math.round(summary.savingsRate * 100);
  const delta = previous ? Math.round((summary.savingsRate - previous.savingsRate) * 100) : null;

  return [
    {
      id: "savings-rate",
      severity:
        summary.savingsRate < 0 ? "critical" : summary.savingsRate < 0.2 ? "warning" : "info",
      title: `You kept ${rate}% of your income`,
      detail:
        delta === null
          ? "No previous month to compare yet."
          : `${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta)} points from last month.`,
    },
  ];
}

function budgetInsights(
  rows: BudgetLine[],
  formatAmount: (minor: number) => string
): Insight[] {
  const out: Insight[] = [];

  for (const row of rows.filter((line) => line.status.tone === "over").slice(0, 3)) {
    out.push({
      id: `budget-over:${row.categoryId}`,
      severity: "critical",
      categoryId: row.categoryId,
      title: `${row.name} is over budget`,
      detail: `${row.status.pct}% of the budget used, ${formatAmount(Math.abs(row.status.remainingMinor))} over.`,
      amountMinor: row.spentMinor,
    });
  }

  for (const row of rows.filter((line) => line.status.tone === "warn").slice(0, 3)) {
    out.push({
      id: `budget-warn:${row.categoryId}`,
      severity: "warning",
      categoryId: row.categoryId,
      title: `${row.name} is close to its budget`,
      detail: `${row.status.pct}% used, ${formatAmount(row.status.remainingMinor)} left.`,
      amountMinor: row.spentMinor,
    });
  }

  return out;
}

function categorySpikes(
  current: MonthSummary,
  previous: MonthSummary | null,
  formatAmount: (minor: number) => string
): Insight[] {
  if (!previous || current.expenseMinor <= 0) return [];

  return current.byCategory
    .map((row) => {
      const before =
        previous.byCategory.find((item) => item.categoryId === row.categoryId)?.totalMinor ?? 0;
      const delta = row.totalMinor - before;
      const pct = before === 0 ? null : Math.round((delta / before) * 100);
      return { row, delta, pct };
    })
    .filter(
      ({ delta, pct }) =>
        delta > 0 && pct !== null && pct >= 30 && delta >= current.expenseMinor * 0.1
    )
    .slice(0, 2)
    .map(({ row, delta, pct }) => ({
      id: `category-spike:${row.categoryId ?? "uncategorized"}`,
      severity: "warning" as const,
      categoryId: row.categoryId,
      title: `${row.name} jumped ${pct}%`,
      detail: `This month it is up by ${formatAmount(delta)} compared with last month.`,
      amountMinor: row.totalMinor,
    }));
}

function topCategory(summary: MonthSummary): Insight[] {
  if (summary.expenseMinor <= 0) return [];

  const top = summary.byCategory[0];
  const share = Math.round((top.totalMinor / summary.expenseMinor) * 100);
  if (share < 30) return [];

  return [
    {
      id: `top-category:${top.categoryId ?? "uncategorized"}`,
      severity: "info",
      categoryId: top.categoryId,
      title: `${top.name} takes ${share}% of your spending`,
      detail: `${top.count} transaction${top.count === 1 ? "" : "s"} this month.`,
      amountMinor: top.totalMinor,
    },
  ];
}

function commitments(summary: MonthSummary, transactions: TransactionLike[]): Insight[] {
  const months = [summary.month];
  for (const transaction of transactions) {
    const key = transaction.occurredOn.slice(0, 7);
    if (!months.includes(key)) months.push(key);
  }

  const recent = months.sort().slice(-3);
  if (recent.length < 3) return [];

  const totals = new Map<string, Map<string, number>>();
  for (const transaction of transactions) {
    if (transaction.kind !== "expense" || !transaction.categoryId) continue;
    const key = transaction.occurredOn.slice(0, 7);
    if (!recent.includes(key)) continue;

    const perCategory = totals.get(transaction.categoryId) ?? new Map<string, number>();
    perCategory.set(key, (perCategory.get(key) ?? 0) + transaction.amountMinor);
    totals.set(transaction.categoryId, perCategory);
  }

  const out: Insight[] = [];
  for (const [categoryId, perMonth] of totals) {
    if (!recent.every((key) => perMonth.has(key))) continue;

    const average = Math.round(
      [...perMonth.values()].reduce((sum, value) => sum + value, 0) / recent.length
    );
    out.push({
      id: `commitments:${categoryId}`,
      severity: "info",
      categoryId,
      title: `${summary.byCategory.find((row) => row.categoryId === categoryId)?.name ?? "A category"} looks like a monthly commitment`,
      detail: "About this much every month for the last three months.",
      amountMinor: average,
    });
  }

  return out.slice(0, 2);
}

function pace(summary: MonthSummary, transactions: TransactionLike[], today: string): Insight[] {
  if (today.slice(0, 7) !== summary.month) return [];

  const day = Number(today.slice(8, 10));
  if (day < 5) return [];

  const previousMonth = shiftMonth(summary.month, -1);
  const previousRows = transactions.filter(
    (row) => row.kind === "expense" && row.occurredOn.startsWith(previousMonth)
  );
  if (!previousRows.length) return [];

  const previousSoFar = previousRows
    .filter((row) => Number(row.occurredOn.slice(8, 10)) <= day)
    .reduce((sum, row) => sum + row.amountMinor, 0);
  if (previousSoFar <= 0) return [];

  const change = Math.round(((summary.expenseMinor - previousSoFar) / previousSoFar) * 100);
  if (Math.abs(change) < 15) return [];

  return [
    {
      id: "pace",
      severity: change > 0 ? "warning" : "info",
      amountMinor: summary.expenseMinor,
      title:
        change > 0
          ? `You are spending ${change}% faster than last month`
          : `You are spending ${Math.abs(change)}% slower than last month`,
      detail: `Compared with the first ${day} days of last month.`,
    },
  ];
}

function outliers(summary: MonthSummary, transactions: TransactionLike[]): Insight[] {
  const rows = transactions.filter(
    (row) => row.kind === "expense" && row.occurredOn.startsWith(summary.month)
  );
  const byCategory = new Map<string, TransactionLike[]>();
  for (const row of rows) {
    if (!row.categoryId) continue;
    byCategory.set(row.categoryId, [...(byCategory.get(row.categoryId) ?? []), row]);
  }

  const out: Insight[] = [];
  for (const [categoryId, items] of byCategory) {
    if (items.length < 3) continue;

    const sorted = items.map((item) => item.amountMinor).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const biggest = items.find(
      (item) => item.amountMinor >= median * 3 && item.amountMinor >= summary.expenseMinor * 0.05
    );
    if (!biggest) continue;

    out.push({
      id: `outlier:${biggest.id}`,
      severity: "warning",
      categoryId,
      title: "Unusually large transaction",
      detail: `${biggest.occurredOn} is at least three times the median for this category.`,
      amountMinor: biggest.amountMinor,
    });
  }

  return out.slice(0, 2);
}

export function buildInsights(input: InsightInput): Insight[] {
  const { summary, previous, budgets: budgetRows, transactions, today, formatAmount } = input;

  return [
    ...savingsRate(summary, previous),
    ...budgetInsights(budgetRows, formatAmount),
    ...categorySpikes(summary, previous, formatAmount),
    ...topCategory(summary),
    ...commitments(summary, transactions),
    ...pace(summary, transactions, today),
    ...outliers(summary, transactions),
  ].sort(
    (a, b) => RANK[b.severity] - RANK[a.severity] || (b.amountMinor ?? 0) - (a.amountMinor ?? 0)
  );
}
