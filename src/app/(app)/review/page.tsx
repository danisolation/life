import { requireUser } from "@/lib/session";
import { isMonth } from "@/lib/validate";
import { monthKey, todayKey } from "@/lib/money/period";
import { colorByCategory, loadMonthView } from "@/lib/money-data";
import { formatMoney } from "@/lib/money/amount";
import { formatMonthLabel, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthNav } from "@/components/money/month-nav";
import { SummaryCards } from "@/components/money/summary-cards";
import { CategoryBars } from "@/components/money/category-bars";
import { BudgetList } from "@/components/money/budget-list";
import { InsightList } from "@/components/money/insight-list";
import { ForecastCard } from "@/components/money/forecast-card";
import { MonthTrend } from "@/components/money/month-trend";

function signed(value: number, currency: string, locale: string): string {
  const formatted = formatMoney(Math.abs(value), currency, locale);
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

export default async function ReviewPage({
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
  const colors = colorByCategory(view.categories);
  const { comparison } = view;

  const deltaRows = [
    {
      label: "Expenses",
      value: comparison.expenseDeltaMinor,
      pct: comparison.expenseDeltaPct,
      invert: true,
    },
    { label: "Income", value: comparison.incomeDeltaMinor, pct: comparison.incomeDeltaPct, invert: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review"
        description={`How ${formatMonthLabel(selected, user.locale)} compares with the month before.`}
      />

      <MonthNav month={selected} basePath="/review" locale={user.locale} />

      <SummaryCards summary={view.summary} currency={user.currency} locale={user.locale} />

      {view.forecast && (
        <ForecastCard forecast={view.forecast} currency={user.currency} locale={user.locale} />
      )}

      <MonthTrend rows={view.trend} currency={user.currency} locale={user.locale} />

      <Card>
        <CardHeader>
          <CardTitle>Compared with {formatMonthLabel(view.previousMonth, user.locale)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {deltaRows.map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    (row.invert ? row.value <= 0 : row.value >= 0) ? "text-success" : "text-destructive"
                  }`}
                >
                  {signed(row.value, user.currency, user.locale)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {row.pct === null ? "No data last month" : `${row.pct >= 0 ? "+" : ""}${row.pct}%`}
                </p>
              </div>
            ))}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Savings rate</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatPercent(view.summary.savingsRate * 100)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {comparison.savingsRateDelta >= 0 ? "+" : "−"}
                {formatPercent(Math.abs(comparison.savingsRateDelta) * 100)} points
              </p>
            </div>
          </div>

          {comparison.movers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 text-right font-medium">{formatMonthLabel(selected, user.locale)}</th>
                    <th className="py-2 text-right font-medium">
                      {formatMonthLabel(view.previousMonth, user.locale)}
                    </th>
                    <th className="py-2 text-right font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparison.movers.map((mover) => (
                    <tr key={mover.categoryId ?? "uncategorized"}>
                      <td className="flex items-center gap-2 py-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: mover.categoryId ? colors[mover.categoryId] : "#94a3b8",
                          }}
                        />
                        <span className="truncate">{mover.name}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(mover.currentMinor, user.currency, user.locale)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {formatMoney(mover.previousMinor, user.currency, user.locale)}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          mover.deltaMinor > 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        {signed(mover.deltaMinor, user.currency, user.locale)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {mover.deltaPct === null ? "—" : `${mover.deltaPct >= 0 ? "+" : ""}${mover.deltaPct}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Where the money went</h2>
          <CategoryBars
            rows={view.summary.byCategory.map((row) => ({
              ...row,
              color: row.categoryId ? (colors[row.categoryId] ?? "#94a3b8") : "#94a3b8",
            }))}
            expenseMinor={view.summary.expenseMinor}
            currency={user.currency}
            locale={user.locale}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Budgets</h2>
          <BudgetList
            lines={view.lines}
            currency={user.currency}
            locale={user.locale}
            emptyLabel="No budgets for this month yet"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Insights</h2>
        <InsightList
          insights={view.insights}
          currency={user.currency}
          locale={user.locale}
          emptyLabel="Nothing worth flagging this month"
        />
      </div>
    </div>
  );
}
