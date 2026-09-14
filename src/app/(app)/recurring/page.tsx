import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, recurringRules, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { todayKey } from "@/lib/money/period";
import { nextDueDate } from "@/lib/money/recurring";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringManager, type RecurringRow } from "@/components/money/recurring-manager";

export default async function RecurringPage() {
  const user = await requireUser();
  const today = todayKey();

  const [rules, categoryRows, counts] = await Promise.all([
    db.query.recurringRules.findMany({
      where: eq(recurringRules.userId, user.id),
      orderBy: [asc(recurringRules.createdAt)],
    }),
    db.query.categories.findMany({ where: eq(categories.userId, user.id) }),
    db
      .select({ recurringId: transactions.recurringId, count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), isNotNull(transactions.recurringId)))
      .groupBy(transactions.recurringId),
  ]);

  const countById = new Map(counts.map((row) => [row.recurringId, row.count]));

  const rows: RecurringRow[] = rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    kind: rule.kind,
    categoryId: rule.categoryId,
    amountMinor: rule.amountMinor,
    frequency: rule.frequency,
    dayOfMonth: rule.dayOfMonth,
    weekday: rule.weekday,
    startsOn: rule.startsOn,
    archivedAt: rule.archivedAt,
    generatedCount: countById.get(rule.id) ?? 0,
    nextDue: nextDueDate(rule, today),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        description="Rules that add transactions for you when the app opens."
      />
      <RecurringManager
        rules={rows}
        categories={categoryRows}
        currency={user.currency}
        locale={user.locale}
        today={today}
      />
    </div>
  );
}
