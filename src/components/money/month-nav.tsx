import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/format";
import { shiftMonth } from "@/lib/money/period";

export function MonthNav({
  month,
  basePath,
  locale,
}: {
  month: string;
  basePath: string;
  locale: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        render={<Link href={`${basePath}?month=${shiftMonth(month, -1)}`} />}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-40 text-center text-sm font-medium tabular-nums">
        {formatMonthLabel(month, locale)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        render={<Link href={`${basePath}?month=${shiftMonth(month, 1)}`} />}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
