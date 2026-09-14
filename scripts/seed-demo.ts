import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema.ts";
import { budgets, categories, transactions, users } from "../src/lib/db/schema.ts";
import { defaultCategoryRows } from "../src/lib/db/default-categories.ts";
import { hashPassword } from "../src/lib/auth.ts";
import { monthKey, shiftMonth, todayKey } from "../src/lib/money/period.ts";

const DEMO_EMAIL = "demo@money.local";
const DEMO_PASSWORD = "money1234";
const MONTHS = 6;

let seedState = 20260914;

function random(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}

function between(min: number, max: number): number {
  return Math.round((min + random() * (max - min)) / 1_000) * 1_000;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

type Plan = {
  name: string;
  min: number;
  max: number;
  count: [number, number];
  day?: number;
  notes: string[];
};

const PLANS: Plan[] = [
  {
    name: "Food & Drinks",
    min: 30_000,
    max: 250_000,
    count: [8, 14],
    notes: ["Lunch", "Coffee", "Dinner out", "Bánh mì"],
  },
  {
    name: "Groceries",
    min: 150_000,
    max: 900_000,
    count: [2, 4],
    notes: ["Groceries run", "Market", "Convenience store"],
  },
  {
    name: "Transport",
    min: 20_000,
    max: 180_000,
    count: [4, 8],
    notes: ["Grab", "Fuel", "Parking"],
  },
  { name: "Rent", min: 6_000_000, max: 6_000_000, count: [1, 1], day: 5, notes: ["Monthly rent"] },
  { name: "Utilities", min: 400_000, max: 900_000, count: [1, 1], day: 7, notes: ["Electricity"] },
  { name: "Phone & Internet", min: 200_000, max: 200_000, count: [1, 1], day: 8, notes: ["Phone plan"] },
  { name: "Health", min: 100_000, max: 1_200_000, count: [0, 2], notes: ["Pharmacy", "Clinic"] },
  { name: "Shopping", min: 200_000, max: 1_800_000, count: [0, 3], notes: ["Clothes", "Home goods"] },
  {
    name: "Entertainment",
    min: 100_000,
    max: 800_000,
    count: [1, 3],
    notes: ["Cinema", "Game", "Concert"],
  },
  { name: "Education", min: 300_000, max: 1_500_000, count: [0, 1], notes: ["Course", "Books"] },
  {
    name: "Gifts & Donations",
    min: 200_000,
    max: 1_000_000,
    count: [0, 1],
    notes: ["Birthday gift", "Charity"],
  },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const existing = await db.query.users.findFirst({ where: eq(users.email, DEMO_EMAIL) });

  const user = existing
    ? (
        await db
          .update(users)
          .set({ name: "Demo User", passwordHash, currency: "VND", locale: "vi-VN", updatedAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(users)
          .values({
            email: DEMO_EMAIL,
            name: "Demo User",
            passwordHash,
            currency: "VND",
            locale: "vi-VN",
          })
          .returning()
      )[0];

  await db.delete(transactions).where(eq(transactions.userId, user.id));
  await db.delete(budgets).where(eq(budgets.userId, user.id));
  await db.delete(categories).where(eq(categories.userId, user.id));

  const categoryRows = await db.insert(categories).values(defaultCategoryRows(user.id)).returning();
  const byName = new Map(categoryRows.map((row) => [row.name, row.id]));
  const categoryId = (name: string): string => {
    const id = byName.get(name);
    if (!id) throw new Error(`Missing category ${name}`);
    return id;
  };

  const today = todayKey();
  const currentMonth = monthKey(new Date());
  const todayDay = Number(today.slice(8, 10));
  const months = Array.from({ length: MONTHS }, (_, index) =>
    shiftMonth(currentMonth, -(MONTHS - 1 - index))
  );
  const heavyMonth = shiftMonth(currentMonth, -3);
  const spikeMonth = currentMonth;
  const spikeBaseMonth = shiftMonth(currentMonth, -1);

  type Row = typeof transactions.$inferInsert;
  const rows: Row[] = [];

  function add(
    month: string,
    categoryName: string,
    amountMinor: number,
    day: number,
    note: string | null
  ) {
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const capped = month === currentMonth ? Math.min(day, todayDay) : Math.min(day, daysInMonth);
    rows.push({
      userId: user.id,
      kind: categoryName === "Salary" || categoryName === "Freelance" ? "income" : "expense",
      categoryId: categoryId(categoryName),
      amountMinor,
      currency: user.currency,
      occurredOn: `${month}-${String(Math.max(capped, 1)).padStart(2, "0")}`,
      note,
    });
  }

  for (const month of months) {
    add(month, "Salary", between(18_000_000, 22_000_000), 5, "Monthly salary");
    if (random() < 0.5) add(month, "Freelance", between(2_000_000, 5_000_000), 20, "Side project");

    for (const plan of PLANS) {
      const count = Math.round(plan.count[0] + random() * (plan.count[1] - plan.count[0]));
      for (let index = 0; index < count; index += 1) {
        add(
          month,
          plan.name,
          between(plan.min, plan.max),
          plan.day ?? Math.ceil(random() * 28),
          pick(plan.notes)
        );
      }
    }

    if (month === heavyMonth) add(month, "Shopping", 25_000_000, 12, "Laptop replacement");
    if (month === spikeBaseMonth) add(month, "Education", 1_000_000, 15, "Course");
    if (month === spikeMonth) {
      add(month, "Education", 6_000_000, 9, "Course");
      add(month, "Health", 150_000, 4, "Pharmacy");
      add(month, "Health", 150_000, 6, "Pharmacy");
      add(month, "Health", 150_000, 11, "Pharmacy");
      add(month, "Health", 6_000_000, 13, "Dental work");
    }
  }

  add(spikeMonth, "Shopping", 3_500_000, 3, "Clothes");

  for (const month of months) {
    const monthRows = rows.filter((row) => row.occurredOn.startsWith(month));
    if (monthRows.length) await db.insert(transactions).values(monthRows);
  }

  const monthRows = rows.filter((row) => row.occurredOn.startsWith(currentMonth));
  const spentIn = (name: string) =>
    monthRows
      .filter((row) => row.categoryId === categoryId(name))
      .reduce((sum, row) => sum + row.amountMinor, 0);
  const roundTo = (value: number) => Math.floor(value / 10_000) * 10_000;

  const foodBudget = roundTo(spentIn("Food & Drinks") / 0.9);
  const groceriesBudget = roundTo(spentIn("Groceries") / 0.5);
  const shoppingBudget = roundTo(spentIn("Shopping") / 1.1);

  await db.insert(budgets).values([
    { userId: user.id, categoryId: categoryId("Food & Drinks"), month: `${currentMonth}-01`, amountMinor: foodBudget },
    { userId: user.id, categoryId: categoryId("Groceries"), month: `${currentMonth}-01`, amountMinor: groceriesBudget },
    { userId: user.id, categoryId: categoryId("Shopping"), month: `${currentMonth}-01`, amountMinor: shoppingBudget },
  ]);

  const foodPct = Math.round((spentIn("Food & Drinks") / foodBudget) * 100);
  const shoppingPct = Math.round((spentIn("Shopping") / shoppingBudget) * 100);

  if (foodPct < 80 || foodPct > 100) {
    throw new Error(`Food budget should land in the warn band, got ${foodPct}%`);
  }
  if (shoppingPct <= 100) {
    throw new Error(`Shopping budget should be exceeded, got ${shoppingPct}%`);
  }

  console.log("");
  console.log("Demo account ready");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(`  currency: ${user.currency}  locale: ${user.locale}`);
  console.log("");
  console.log(`Seeded ${rows.length} transactions across ${MONTHS} months (${months[0]} → ${currentMonth})`);
  console.log(`  ${heavyMonth} spends more than it earns (25M laptop)`);
  console.log(`  ${spikeMonth} Education is 500% up on ${spikeBaseMonth}`);
  console.log(`Budgets for ${currentMonth}:`);
  console.log(`  Food & Drinks  ${foodBudget}  → ${foodPct}% used (warn)`);
  console.log(`  Groceries      ${groceriesBudget}`);
  console.log(`  Shopping       ${shoppingBudget}  → ${shoppingPct}% used (over)`);
  console.log("");
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
