import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, categories, transactions } from "@/lib/db/schema";
import { budgetLines, type BudgetLine } from "@/lib/money/budget";
import { formatMoney } from "@/lib/money/amount";
import { compareMonths, type MonthComparison } from "@/lib/money/compare";
import { buildInsights, type Insight } from "@/lib/money/insights";
import { daysElapsed, monthRange, shiftMonth } from "@/lib/money/period";
import { summarize, type CategoryTotal, type MonthSummary } from "@/lib/money/summary";
import { firstDayOf } from "@/lib/validate";

export type CategoryRecord = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  archivedAt: Date | null;
};

export type TransactionRecord = {
  id: string;
  kind: "income" | "expense";
  categoryId: string | null;
  amountMinor: number;
  currency: string;
  occurredOn: string;
  note: string | null;
};

export type MonthView = {
  month: string;
  previousMonth: string;
  summary: MonthSummary;
  previous: MonthSummary;
  comparison: MonthComparison;
  lines: BudgetLine[];
  budgets: { categoryId: string; amountMinor: number }[];
  insights: Insight[];
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  spentByCategory: Record<string, CategoryTotal>;
};

export async function loadMonthView(
  userId: string,
  month: string,
  today: string,
  money: { currency: string; locale: string }
): Promise<MonthView> {
  const previousMonth = shiftMonth(month, -1);
  const range = {
    start: monthRange(shiftMonth(month, -2)).start,
    end: monthRange(month).end,
  };

  const [rows, categoryRows, budgetRows] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, range.start),
        lte(transactions.occurredOn, range.end)
      ),
    }),
    db.query.categories.findMany({ where: eq(categories.userId, userId) }),
    db.query.budgets.findMany({
      where: and(eq(budgets.userId, userId), eq(budgets.month, firstDayOf(month))),
    }),
  ]);

  const transactionRows = rows as TransactionRecord[];
  const categoryList = categoryRows as CategoryRecord[];
  const monthRows = transactionRows.filter((row) => row.occurredOn.startsWith(month));
  const previousRows = transactionRows.filter((row) => row.occurredOn.startsWith(previousMonth));

  const summary = summarize(monthRows, categoryList, {
    month,
    daysElapsed: daysElapsed(month, today),
  });
  const previous = summarize(previousRows, categoryList, {
    month: previousMonth,
    daysElapsed: daysElapsed(previousMonth, today),
  });

  const lines = budgetLines(
    summary,
    budgetRows.map((row) => ({ categoryId: row.categoryId, amountMinor: row.amountMinor }))
  );
  const budgetList = budgetRows.map((row) => ({
    categoryId: row.categoryId,
    amountMinor: row.amountMinor,
  }));

  return {
    month,
    previousMonth,
    summary,
    previous,
    comparison: compareMonths(summary, previous),
    lines,
    budgets: budgetList,
    insights: buildInsights({
      summary,
      previous,
      budgets: lines,
      transactions: transactionRows,
      today,
      formatAmount: (minor) => formatMoney(minor, money.currency, money.locale),
    }),
    transactions: transactionRows,
    categories: categoryList,
    spentByCategory: Object.fromEntries(
      summary.byCategory
        .filter((row) => row.categoryId)
        .map((row) => [row.categoryId as string, row])
    ),
  };
}

export function colorByCategory(categoryList: CategoryRecord[]): Record<string, string> {
  return Object.fromEntries(categoryList.map((category) => [category.id, category.color]));
}

export function noteToCategoryMap(rows: TransactionRecord[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!row.note || !row.categoryId) continue;
    map[row.note.trim().toLowerCase()] = row.categoryId;
  }
  return map;
}

export async function loadNoteMap(userId: string): Promise<Record<string, string>> {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: desc(transactions.occurredOn),
    limit: 300,
  });
  return noteToCategoryMap(rows as TransactionRecord[]);
}
