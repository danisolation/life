import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuickEntry } from "./quick-entry.ts";

test("reads an amount before or after the note", () => {
  assert.deepEqual(parseQuickEntry("65k ăn trưa", "VND"), {
    kind: "expense",
    amount: "65k",
    note: "ăn trưa",
  });
  assert.deepEqual(parseQuickEntry("ăn trưa 65k", "VND"), {
    kind: "expense",
    amount: "65k",
    note: "ăn trưa",
  });
});

test("a leading plus means income", () => {
  assert.deepEqual(parseQuickEntry("+20tr lương", "VND"), {
    kind: "income",
    amount: "20tr",
    note: "lương",
  });
  assert.deepEqual(parseQuickEntry("-30k taxi", "VND"), {
    kind: "expense",
    amount: "30k",
    note: "taxi",
  });
});

test("handles separators, spacing and decimals", () => {
  assert.equal(parseQuickEntry("1.500.000 tiền nhà", "VND")?.amount, "1.500.000");
  assert.equal(parseQuickEntry("50 k cà phê", "VND")?.amount, "50k");
  assert.equal(parseQuickEntry("12.50 lunch", "USD")?.amount, "12.50");
  assert.equal(parseQuickEntry("1,5tr", "VND")?.amount, "1,5tr");
});

test("keeps the note clean when there is none", () => {
  assert.deepEqual(parseQuickEntry("50000", "VND"), {
    kind: "expense",
    amount: "50000",
    note: null,
  });
});

test("does not swallow words that start with a shorthand letter", () => {
  assert.deepEqual(parseQuickEntry("50 meals", "VND"), {
    kind: "expense",
    amount: "50",
    note: "meals",
  });
  assert.deepEqual(parseQuickEntry("20 movie tickets", "VND"), {
    kind: "expense",
    amount: "20",
    note: "movie tickets",
  });
});

test("returns null when there is no usable amount", () => {
  assert.equal(parseQuickEntry("", "VND"), null);
  assert.equal(parseQuickEntry("   ", "VND"), null);
  assert.equal(parseQuickEntry("cà phê sáng", "VND"), null);
  assert.equal(parseQuickEntry("0 ăn vặt", "VND"), null);
  assert.equal(parseQuickEntry("100,50 lẻ", "VND"), null);
});
