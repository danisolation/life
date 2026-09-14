import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money/amount";
import type { MonthSummary } from "@/lib/money/summary";

export function SummaryCards({
  summary,
  currency,
  locale,
}: {
  summary: MonthSummary;
  currency: string;
  locale: string;
}) {
  const items = [
    {
      label: "Income",
      value: formatMoney(summary.incomeMinor, currency, locale),
      tone: "text-success",
    },
    {
      label: "Expenses",
      value: formatMoney(summary.expenseMinor, currency, locale),
      tone: "",
    },
    {
      label: "Net",
      value: formatMoney(summary.netMinor, currency, locale),
      tone: summary.netMinor >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Savings rate",
      value: formatPercent(summary.savingsRate * 100),
      tone: summary.savingsRate >= 0.2 ? "text-success" : "",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-semibold tabular-nums ${item.tone}`}>
            {item.value}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
