import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, insightTone } from "@/components/status-badge";
import { formatMoney } from "@/lib/money/amount";
import type { Insight } from "@/lib/money/insights";

export function InsightList({
  insights,
  currency,
  locale,
  emptyLabel,
}: {
  insights: Insight[];
  currency: string;
  locale: string;
  emptyLabel: string;
}) {
  if (!insights.length) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={Sparkles} title={emptyLabel} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <Card key={insight.id}>
          <CardContent className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={insightTone(insight.severity)}>
                  {insight.severity}
                </StatusBadge>
                <p className="text-sm font-medium">{insight.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{insight.detail}</p>
            </div>
            {insight.amountMinor !== undefined && (
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatMoney(insight.amountMinor, currency, locale)}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
