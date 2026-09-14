import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, minorUnitDigits, parseAmount } from "./amount.ts";

test("minorUnitDigits knows zero-decimal currencies", () => {
  assert.equal(minorUnitDigits("VND"), 0);
  assert.equal(minorUnitDigits("usd"), 2);
});

test("parses VND amounts", () => {
  assert.equal(parseAmount("50000", "VND"), 50_000);
  assert.equal(parseAmount("50.000", "VND"), 50_000);
  assert.equal(parseAmount("1.500.000 đ", "VND"), 1_500_000);
  assert.equal(parseAmount("50k", "VND"), 50_000);
  assert.equal(parseAmount("1,5tr", "VND"), 1_500_000);
  assert.equal(parseAmount("2m", "VND"), 2_000_000);
});

test("parses two-decimal amounts", () => {
  assert.equal(parseAmount("12.50", "USD"), 1_250);
  assert.equal(parseAmount("1,234.56", "USD"), 123_456);
  assert.equal(parseAmount("1.234", "USD"), 123_400);
  assert.equal(parseAmount("7", "USD"), 700);
  assert.equal(parseAmount("1.5k", "USD"), 150_000);
});

test("rejects junk, zero, negative and ambiguous decimals", () => {
  assert.throws(() => parseAmount("", "VND"));
  assert.throws(() => parseAmount("abc", "VND"));
  assert.throws(() => parseAmount("0", "VND"));
  assert.throws(() => parseAmount("-5", "VND"));
  assert.throws(() => parseAmount("100,50", "VND"));
});

test("formats money with Intl", () => {
  assert.equal(formatMoney(50_000, "VND", "vi-VN").replace(/\u00a0/g, " "), "50.000 ₫");
  assert.equal(formatMoney(123_456, "USD", "en-US"), "$1,234.56");
});
