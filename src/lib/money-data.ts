import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, categories, recurringRules, transactions } from "@/lib/db/schema";
import { budgetLines, type BudgetLine } from "@/lib/money/budget";
import { formatMoney, minorUnitDigits } from "@/lib/money/amount";
import { suggestBudgets, type BudgetSuggestion } from "@/lib/money/budget-suggest";
import { compareMonths, type MonthComparison } from "@/lib/money/compare";
import { forecast as forecastOf, type Forecast } from "@/lib/money/forecast";
import { buildInsights, type Insight } from "@/lib/money/insights";
import { dueDatesFor } from "@/lib/money/recurring";
import {
  daysElapsed,
  daysInMonth,
  monthRange,
  shiftMonth,
} from "@/lib/money/period";
import { summarize, type CategoryTotal, type MonthSummary } from "@/lib/money/summary";
import { firstDayOf } from "@/lib/validate";

async function committedForMonth(
  userId: string,
  month: string,
  today: string
): Promise<number> {
  if (month !== today.slice(0, 7)) return 0;

  const rules = await db.query.recurringRules.findMany({
    where: and(eq(recurringRules.userId, userId), eq(recurringRules.kind, "expense")),
  });
  const monthEnd = monthRange(month).end;

  return rules.reduce((sum, rule) => {
    if (rule.archivedAt) return sum;
    const dates = dueDatesFor(
      {
        frequency: rule.frequency,
        dayOfMonth: rule.dayOfMonth,
        weekday: rule.weekday,
        startsOn: rule.startsOn,
        lastGeneratedOn: today,
      },
      monthEnd
    );
    return sum + dates.length * rule.amountMinor;
  }, 0);
}

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
  recurringId: string | null;
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
  trend: { month: string; incomeMinor: number; expenseMinor: number }[];
  budgetSuggestions: BudgetSuggestion[];
  forecast: Forecast | null;
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
    start: monthRange(shiftMonth(month, -5)).start,
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

  const trend = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)).map(
    (key) => {
      const rows = transactionRows.filter((row) => row.occurredOn.startsWith(key));
      return {
        month: key,
        incomeMinor: rows
          .filter((row) => row.kind === "income")
          .reduce((sum, row) => sum + row.amountMinor, 0),
        expenseMinor: rows
          .filter((row) => row.kind === "expense")
          .reduce((sum, row) => sum + row.amountMinor, 0),
      };
    }
  );

  const completedMonths = [1, 2, 3].map((offset) => shiftMonth(month, -offset));
  const historyRows = transactionRows
    .filter((row) => row.kind === "expense" && completedMonths.includes(row.occurredOn.slice(0, 7)))
    .reduce<{ month: string; categoryId: string; totalMinor: number }[]>((acc, row) => {
      if (!row.categoryId) return acc;
      const month = row.occurredOn.slice(0, 7);
      const existing = acc.find(
        (item) => item.month === month && item.categoryId === row.categoryId
      );
      if (existing) existing.totalMinor += row.amountMinor;
      else acc.push({ month, categoryId: row.categoryId, totalMinor: row.amountMinor });
      return acc;
    }, []);

  const stepMinor = minorUnitDigits(money.currency) === 0 ? 100_000 : 1_000;
  const budgetSuggestions = suggestBudgets(historyRows, { stepMinor });

  const committedMinor = await committedForMonth(userId, month, today);

  return {
    month,
    previousMonth,
    summary,
    previous,
    comparison: compareMonths(summary, previous),
    lines,
    budgets: budgetList,
    trend,
    budgetSuggestions,
    forecast:
      month === today.slice(0, 7)
        ? forecastOf({
            expenseMinor: summary.expenseMinor,
            incomeMinor: summary.incomeMinor,
            daysElapsed: daysElapsed(month, today),
            daysInMonth: daysInMonth(month),
            committedMinor,
          })
        : null,
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
