import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { requireUser } from "@/lib/session";
import { isMonth } from "@/lib/validate";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="How this month is going."
        action={
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
        }
      />

      <MonthNav month={selected} basePath="/" locale={user.locale} />

      {selected === monthKey(new Date()) && (
        <QuickCapture
          currency={user.currency}
          today={today}
          categories={view.categories}
          recentByNote={noteToCategoryMap(view.transactions)}
        />
      )}

      <SummaryCards summary={view.summary} currency={user.currency} locale={user.locale} />

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
