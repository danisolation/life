import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { formatMoney } from "@/lib/money/amount";
import type { BudgetLine } from "@/lib/money/budget";

function barClass(tone: BudgetLine["status"]["tone"]): string {
  if (tone === "over") return "bg-destructive";
  if (tone === "warn") return "bg-warning";
  return "bg-success";
}

export function BudgetList({
  lines,
  currency,
  locale,
  emptyLabel,
}: {
  lines: BudgetLine[];
  currency: string;
  locale: string;
  emptyLabel: string;
}) {
  if (!lines.length) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={Target} title={emptyLabel} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <div key={line.categoryId} className="space-y-2">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium">{line.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatMoney(line.spentMinor, currency, locale)} /{" "}
              {formatMoney(line.limitMinor, currency, locale)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barClass(line.status.tone)}`}
              style={{ width: `${Math.min(line.status.pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {line.status.tone === "over"
              ? `${formatMoney(Math.abs(line.status.remainingMinor), currency, locale)} over budget`
              : `${formatMoney(line.status.remainingMinor, currency, locale)} left`}
          </p>
        </div>
      ))}
    </div>
  );
}
