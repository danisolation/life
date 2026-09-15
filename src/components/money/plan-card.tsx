import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money/amount";
import { planVariance, type MonthPlan } from "@/lib/money/plan";

export function PlanCard({
  plan,
  actualNetMinor,
  currency,
  locale,
}: {
  plan: MonthPlan;
  actualNetMinor: number;
  currency: string;
  locale: string;
}) {
  const { netDeltaMinor } = planVariance(plan, { netMinor: actualNetMinor });
  const ahead = netDeltaMinor >= 0;

  const items = [
    {
      label: "Planned income",
      value: formatMoney(plan.incomeMinor, currency, locale),
      detail: "from your income budgets",
    },
    {
      label: "Planned spending",
      value: formatMoney(plan.expenseMinor, currency, locale),
      detail: "from your expense budgets",
    },
    {
      label: "Planned left over",
      value: formatMoney(plan.leftOverMinor, currency, locale),
      detail: "planned income minus spending",
    },
    {
      label: ahead ? "Ahead of plan" : "Behind plan",
      value: formatMoney(Math.abs(netDeltaMinor), currency, locale),
      detail: `net this month is ${formatMoney(actualNetMinor, currency, locale)}`,
      tone: ahead ? "text-success" : "text-destructive",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your plan for this month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          The plan is the budgets you set on income and expense categories. The difference compares
          your real net with the amount you planned to keep.
        </p>
      </CardContent>
    </Card>
  );
}
