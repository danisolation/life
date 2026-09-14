import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { categories, transactions } from "./db/schema";
import { minorUnitDigits } from "./money/amount";
import { daysInMonth, monthKey, shiftMonth, todayKey } from "./money/period";

const SAMPLE_SOURCE = "sample";

const SAMPLE_PLAN: {
  category: string;
  kind: "income" | "expense";
  min: number;
  max: number;
  count: [number, number];
  notes: string[];
}[] = [
  { category: "Salary", kind: "income", min: 18_000_000, max: 22_000_000, count: [1, 1], notes: ["Monthly salary"] },
  { category: "Food & Drinks", kind: "expense", min: 30_000, max: 250_000, count: [6, 10], notes: ["Lunch", "Coffee", "Dinner out"] },
  { category: "Groceries", kind: "expense", min: 150_000, max: 900_000, count: [2, 3], notes: ["Groceries run", "Market"] },
  { category: "Transport", kind: "expense", min: 20_000, max: 180_000, count: [4, 7], notes: ["Grab", "Fuel"] },
  { category: "Rent", kind: "expense", min: 6_000_000, max: 6_000_000, count: [1, 1], notes: ["Monthly rent"] },
  { category: "Utilities", kind: "expense", min: 400_000, max: 900_000, count: [1, 1], notes: ["Electricity"] },
  { category: "Phone & Internet", kind: "expense", min: 200_000, max: 200_000, count: [1, 1], notes: ["Phone plan"] },
  { category: "Entertainment", kind: "expense", min: 100_000, max: 800_000, count: [1, 2], notes: ["Cinema", "Game"] },
  { category: "Shopping", kind: "expense", min: 200_000, max: 1_500_000, count: [1, 2], notes: ["Clothes", "Home goods"] },
];

const MONTHS = 3;

function scaler(currency: string): number {
  return minorUnitDigits(currency) === 0 ? 1 : 0.0002;
}

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
  monthStart: string
): Promise<number> {
  const categoryRows = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });
  const byName = new Map(categoryRows.map((row) => [row.name, row.id]));
  const factor = scaler(currency);
  const today = todayKey();
  const months = Array.from({ length: MONTHS }, (_, index) =>
    shiftMonth(monthKey(new Date(`${monthStart}-01T00:00:00`)), index - (MONTHS - 1))
  );

  const rows: (typeof transactions.$inferInsert)[] = [];

  months.forEach((month, monthIndex) => {
    for (const plan of SAMPLE_PLAN) {
      const categoryId = byName.get(plan.category);
      if (!categoryId) continue;

      const count =
        plan.count[0] + Math.floor((plan.count[1] - plan.count[0] + 1) * ((monthIndex + 1) / 3));
      for (let index = 0; index < count; index += 1) {
        const day = Math.min(
          Math.max(2, Math.round(((index + 1) * 28) / Math.max(count, 1))),
          daysInMonth(month)
        );
        const occurredOn = `${month}-${String(day).padStart(2, "0")}`;
        if (month === monthKey(new Date()) && occurredOn > today) continue;

        const span = plan.max - plan.min;
        const amount = plan.min + Math.round((span * ((index + 1) % 3)) / 2);
        rows.push({
          userId,
          kind: plan.kind,
          categoryId,
          amountMinor: Math.max(1, Math.round(amount * factor)),
          currency,
          occurredOn,
          note: plan.notes[index % plan.notes.length],
          source: SAMPLE_SOURCE,
        });
      }
    }
  });

  if (!rows.length) return 0;
  const inserted = await db.insert(transactions).values(rows).returning({ id: transactions.id });
  return inserted.length;
}

export async function removeSampleData(userId: string): Promise<number> {
  const removed = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), isNotNull(transactions.source)))
    .returning({ id: transactions.id });
  return removed.length;
}
