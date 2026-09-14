import { minorUnitDigits } from "./money/amount.ts";
import { daysInMonth, shiftMonth } from "./money/period.ts";

const MONTHS = 3;

type SamplePlan = {
  category: string;
  kind: "income" | "expense";
  min: number;
  max: number;
  count: [number, number];
  notes: string[];
};

const SAMPLE_PLAN: SamplePlan[] = [
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

export type SampleRow = {
  categoryId: string;
  kind: "income" | "expense";
  amountMinor: number;
  occurredOn: string;
  note: string;
};

export function sampleMonths(today: string): string[] {
  const current = today.slice(0, 7);
  return Array.from({ length: MONTHS }, (_, index) => shiftMonth(current, index - (MONTHS - 1)));
}

export function planSampleRows(input: {
  categories: { id: string; name: string }[];
  currency: string;
  today: string;
}): SampleRow[] {
  const { categories, currency, today } = input;
  const byName = new Map(categories.map((row) => [row.name, row.id]));
  const factor = minorUnitDigits(currency) === 0 ? 1 : 0.02;
  const currentMonth = today.slice(0, 7);
  const rows: SampleRow[] = [];

  sampleMonths(today).forEach((month, monthIndex) => {
    for (const plan of SAMPLE_PLAN) {
      const categoryId = byName.get(plan.category);
      if (!categoryId) continue;

      const count =
        plan.count[0] + Math.floor((plan.count[1] - plan.count[0] + 1) * ((monthIndex + 1) / 3));

      for (let index = 0; index < count; index += 1) {
        const day = Math.max(
          2,
          Math.min(Math.round(((index + 1) * 28) / Math.max(count, 1)), daysInMonth(month))
        );
        const occurredOn = `${month}-${String(day).padStart(2, "0")}`;
        if (month === currentMonth && occurredOn > today) continue;

        const span = plan.max - plan.min;
        const amount = plan.min + Math.round((span * ((index + 1) % 3)) / 2);

        rows.push({
          categoryId,
          kind: plan.kind,
          amountMinor: Math.max(1, Math.round(amount * factor)),
          occurredOn,
          note: plan.notes[index % plan.notes.length],
        });
      }
    }
  });

  return rows;
}
