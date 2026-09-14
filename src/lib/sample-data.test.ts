import assert from "node:assert/strict";
import { test } from "node:test";
import { planSampleRows, sampleMonths } from "./sample-plan.ts";

const categories = [
  { id: "salary", name: "Salary" },
  { id: "food", name: "Food & Drinks" },
  { id: "rent", name: "Rent" },
  { id: "utilities", name: "Utilities" },
  { id: "phone", name: "Phone & Internet" },
  { id: "transport", name: "Transport" },
  { id: "groceries", name: "Groceries" },
  { id: "entertainment", name: "Entertainment" },
  { id: "shopping", name: "Shopping" },
];

const today = "2026-09-14";

test("covers the three months ending with the current one", () => {
  assert.deepEqual(sampleMonths(today), ["2026-07", "2026-08", "2026-09"]);
});

test("plans rows with real dates and positive amounts", () => {
  const rows = planSampleRows({ categories, currency: "VND", today });

  assert.ok(rows.length > 20, `expected a decent amount of rows, got ${rows.length}`);
  for (const row of rows) {
    assert.match(row.occurredOn, /^\d{4}-\d{2}-\d{2}$/, `bad date ${row.occurredOn}`);
    assert.ok(row.amountMinor > 0, "amount must be positive");
    assert.ok(sampleMonths(today).includes(row.occurredOn.slice(0, 7)), "month outside the window");
    assert.ok(row.occurredOn <= today, "nothing in the future");
  }
});

test("never plans a day the month does not have", () => {
  const rows = planSampleRows({ categories, currency: "VND", today: "2026-02-10" });
  const february = rows.filter((row) => row.occurredOn.startsWith("2026-02"));
  assert.ok(february.length > 0);
  for (const row of february) {
    assert.ok(Number(row.occurredOn.slice(8, 10)) <= 28, `bad February day ${row.occurredOn}`);
  }
});

test("two-decimal currencies get smaller, round numbers", () => {
  const vnd = planSampleRows({ categories, currency: "VND", today });
  const usd = planSampleRows({ categories, currency: "USD", today });

  const vndRent = vnd.find((row) => row.categoryId === "rent");
  const usdRent = usd.find((row) => row.categoryId === "rent");

  assert.equal(vndRent?.amountMinor, 6_000_000);
  assert.equal(usdRent?.amountMinor, 120_000);
});

test("missing categories are skipped rather than crashing", () => {
  const rows = planSampleRows({ categories: [{ id: "rent", name: "Rent" }], currency: "VND", today });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.categoryId === "rent"));
});
