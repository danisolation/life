import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { recurringRules, transactions } from "./db/schema";
import { dueDatesFor } from "./money/recurring";

export async function materializeRecurring(userId: string, today: string): Promise<number> {
  const rules = await db.query.recurringRules.findMany({
    where: and(eq(recurringRules.userId, userId)),
  });

  let created = 0;

  for (const rule of rules) {
    if (rule.archivedAt) continue;

    const dates = dueDatesFor(
      {
        frequency: rule.frequency,
        dayOfMonth: rule.dayOfMonth,
        weekday: rule.weekday,
        startsOn: rule.startsOn,
        lastGeneratedOn: rule.lastGeneratedOn,
      },
      today
    );
    if (!dates.length) continue;

    const inserted = await db
      .insert(transactions)
      .values(
        dates.map((occurredOn) => ({
          userId: rule.userId,
          kind: rule.kind,
          categoryId: rule.categoryId,
          recurringId: rule.id,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          occurredOn,
          note: rule.name,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: transactions.id });

    await db
      .update(recurringRules)
      .set({ lastGeneratedOn: dates[dates.length - 1], updatedAt: new Date() })
      .where(eq(recurringRules.id, rule.id));

    created += inserted.length;
  }

  return created;
}
