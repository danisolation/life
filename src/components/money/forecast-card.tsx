import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money/amount";
import type { Forecast } from "@/lib/money/forecast";

export function ForecastCard({
  forecast,
  currency,
  locale,
}: {
  forecast: Forecast;
  currency: string;
  locale: string;
}) {
  const items = [
    {
      label: "Spent so far",
      value: formatMoney(forecast.spentMinor, currency, locale),
      detail: `${forecast.daysLeft} days left`,
    },
    {
      label: "Still committed",
      value: formatMoney(forecast.committedMinor, currency, locale),
      detail: "from recurring rules",
    },
    {
      label: "Projected spending",
      value: formatMoney(forecast.projectedExpenseMinor, currency, locale),
      detail: "at the pace so far",
    },
    {
      label: "Projected left over",
      value: formatMoney(forecast.projectedNetMinor, currency, locale),
      detail: "income this month",
      tone: forecast.projectedNetMinor >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where this month is heading</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${item.tone ?? ""}`}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Projection = what you spent + the same daily pace for the remaining days + recurring
          rules still due this month. Nothing here is a guess from a model, it is arithmetic on
          your own numbers.
        </p>
      </CardContent>
    </Card>
  );
}
