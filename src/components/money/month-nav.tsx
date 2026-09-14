import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <Link
        href={`${basePath}?month=${shiftMonth(month, -1)}`}
        aria-label="Previous month"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronLeft />
      </Link>
      <span className="min-w-40 text-center text-sm font-medium tabular-nums">
        {formatMonthLabel(month, locale)}
      </span>
      <Link
        href={`${basePath}?month=${shiftMonth(month, 1)}`}
        aria-label="Next month"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronRight />
      </Link>
    </div>
  );
}
