import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { categories, transactions } from "./db/schema";
import { planSampleRows } from "./sample-plan";

const SAMPLE_SOURCE = "sample";

export async function hasSampleData(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.source, SAMPLE_SOURCE)))
    .limit(1);
  return Boolean(row);
}

export async function loadSampleData(
  userId: string,
  currency: string,
  today: string
): Promise<number> {
  const categoryRows = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });

  const planned = planSampleRows({ categories: categoryRows, currency, today });
  if (!planned.length) return 0;

  const inserted = await db
    .insert(transactions)
    .values(
      planned.map((row) => ({
        userId,
        kind: row.kind,
        categoryId: row.categoryId,
        amountMinor: row.amountMinor,
        currency,
        occurredOn: row.occurredOn,
        note: row.note,
        source: SAMPLE_SOURCE,
      }))
    )
    .returning({ id: transactions.id });

  return inserted.length;
}

export async function removeSampleData(userId: string): Promise<number> {
  const removed = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), isNotNull(transactions.source)))
    .returning({ id: transactions.id });
  return removed.length;
}
