import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, recurringRules, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { firstDayOf, isMonth } from "@/lib/validate";
import { hasSampleData } from "@/lib/sample-data";
import { monthKey, todayKey } from "@/lib/money/period";
import { loadMonthView, noteToCategoryMap } from "@/lib/money-data";
import { formatMoney } from "@/lib/money/amount";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthNav } from "@/components/money/month-nav";
import { SummaryCards } from "@/components/money/summary-cards";
import { BudgetList } from "@/components/money/budget-list";
import { InsightList } from "@/components/money/insight-list";
import { TransactionForm } from "@/components/money/transaction-form";
import { QuickCapture } from "@/components/money/quick-capture";
import { ForecastCard } from "@/components/money/forecast-card";
import { PlanCard } from "@/components/money/plan-card";
import { ReceiptScanner } from "@/components/money/receipt-scanner";
import { GettingStarted } from "@/components/money/getting-started";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month } = await searchParams;
  const today = todayKey();
  const selected = month && isMonth(month) ? month : monthKey(new Date());
  const view = await loadMonthView(user.id, selected, today, {
    currency: user.currency,
    locale: user.locale,
  });

  const monthTransactions = view.transactions.filter((row) => row.occurredOn.startsWith(selected));
  const recent = [...monthTransactions]
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))
    .slice(0, 5);
  const categoryById = new Map(view.categories.map((category) => [category.id, category]));

  const [entryRows, budgetRows, ruleRows, sampleLoaded] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgets)
      .where(and(eq(budgets.userId, user.id), eq(budgets.month, firstDayOf(selected)))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, user.id), isNull(recurringRules.archivedAt))),
    hasSampleData(user.id),
  ]);

  const entryCount = entryRows[0]?.count ?? 0;
  const steps = [
    {
      id: "entry",
      label: "Record your first income or expense",
      hint: "The one-line box above does it: type 65k lunch, or scan a receipt.",
      done: entryCount > 0,
    },
    {
      id: "budget",
      label: "Give a category a monthly budget",
      hint: "Categories is where budgets live, and suggestions are one click away.",
      href: "/categories",
      done: (budgetRows[0]?.count ?? 0) > 0,
    },
    {
      id: "recurring",
      label: "Add rent or a subscription as a recurring rule",
      hint: "Rules add the entry for you whenever you open the app.",
      href: "/recurring",
      done: (ruleRows[0]?.count ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="How this month is going."
        action={
          <div className="flex items-start gap-2">
            <ReceiptScanner
              categories={view.categories}
              currency={user.currency}
              today={today}
              recentByNote={noteToCategoryMap(view.transactions)}
            />
            <TransactionForm
              categories={view.categories}
              currency={user.currency}
              today={today}
              recentByNote={noteToCategoryMap(view.transactions)}
              trigger={
                <>
                  <Plus /> Add
                </>
              }
            />
          </div>
        }
      />

      <MonthNav month={selected} basePath="/" locale={user.locale} />

      {selected === monthKey(new Date()) && (
        <QuickCapture
          currency={user.currency}
          locale={user.locale}
          today={today}
          categories={view.categories}
          recentByNote={noteToCategoryMap(view.transactions)}
        />
      )}

      <SummaryCards summary={view.summary} currency={user.currency} locale={user.locale} />

      {view.plan.hasIncomePlan && (
        <PlanCard
          plan={view.plan}
          actualNetMinor={view.summary.netMinor}
          currency={user.currency}
          locale={user.locale}
        />
      )}

      <GettingStarted steps={steps} isEmpty={entryCount === 0} hasSample={sampleLoaded} />

      {view.forecast && (
        <ForecastCard forecast={view.forecast} currency={user.currency} locale={user.locale} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">What stands out</h2>
            <InsightList
              insights={view.insights.slice(0, 3)}
              currency={user.currency}
              locale={user.locale}
              emptyLabel="Nothing worth flagging this month"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-4">
                <CardTitle>Recent activity</CardTitle>
                <Link
                  href={`/transactions?month=${selected}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Nothing recorded yet"
                  description="Add your first income or expense for this month."
                />
              ) : (
                <ul className="divide-y">
                  {recent.map((transaction) => {
                    const category = transaction.categoryId
                      ? categoryById.get(transaction.categoryId)
                      : undefined;
                    return (
                      <li key={transaction.id} className="flex items-center gap-3 py-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {category?.name ?? "Uncategorized"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDate(transaction.occurredOn, user.locale)}
                            {transaction.note ? ` · ${transaction.note}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-medium tabular-nums ${
                            transaction.kind === "income" ? "text-success" : ""
                          }`}
                        >
                          {transaction.kind === "income" ? "+" : "−"}
                          {formatMoney(transaction.amountMinor, user.currency, user.locale)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Budgets</h2>
          <BudgetList
            lines={view.lines.slice(0, 4)}
            currency={user.currency}
            locale={user.locale}
            emptyLabel="No budgets for this month yet"
          />
        </div>
      </div>
    </div>
  );
}
