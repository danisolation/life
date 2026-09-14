import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money/amount";
import { PieChart } from "lucide-react";

export type CategoryBarRow = {
  categoryId: string | null;
  name: string;
  totalMinor: number;
  count: number;
  color: string;
};

export function CategoryBars({
  rows,
  expenseMinor,
  currency,
  locale,
}: {
  rows: CategoryBarRow[];
  expenseMinor: number;
  currency: string;
  locale: string;
}) {
  if (!rows.length) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={PieChart} title="No spending recorded for this month" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {rows.map((row) => {
          const share = expenseMinor > 0 ? (row.totalMinor / expenseMinor) * 100 : 0;
          return (
            <div key={row.categoryId ?? "uncategorized"} className="space-y-2">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatMoney(row.totalMinor, currency, locale)} · {formatPercent(share)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(share, 100)}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
