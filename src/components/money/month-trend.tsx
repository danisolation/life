import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthLabel, formatMonthShort } from "@/lib/format";
import { formatMoney } from "@/lib/money/amount";

export type TrendRow = { month: string; incomeMinor: number; expenseMinor: number };

export function MonthTrend({
  rows,
  currency,
  locale,
}: {
  rows: TrendRow[];
  currency: string;
  locale: string;
}) {
  const max = Math.max(...rows.flatMap((row) => [row.incomeMinor, row.expenseMinor]), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last six months</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          {rows.map((row) => (
            <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t bg-success-muted-foreground/70"
                  style={{ height: `${Math.max((row.incomeMinor / max) * 100, 1)}%` }}
                  title={`Income ${formatMoney(row.incomeMinor, currency, locale)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-primary/70"
                  style={{ height: `${Math.max((row.expenseMinor / max) * 100, 1)}%` }}
                  title={`Expenses ${formatMoney(row.expenseMinor, currency, locale)}`}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {formatMonthShort(row.month, locale)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-success-muted-foreground/70" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-primary/70" />
            Expenses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 text-right font-medium">Income</th>
                <th className="py-2 text-right font-medium">Expenses</th>
                <th className="py-2 text-right font-medium">Left over</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="py-2">{formatMonthLabel(row.month, locale)}</td>
                  <td className="py-2 text-right tabular-nums text-success">
                    {formatMoney(row.incomeMinor, currency, locale)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(row.expenseMinor, currency, locale)}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      row.incomeMinor - row.expenseMinor >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatMoney(row.incomeMinor - row.expenseMinor, currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
