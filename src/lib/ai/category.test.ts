import assert from "node:assert/strict";
import { test } from "node:test";
import { NO_CATEGORY, buildCategoryPrompt, categorySchema, parseCategorySuggestion } from "./category.ts";
import { SUMMARY_SCHEMA, buildSummaryPrompt, parseSummary } from "./summary.ts";

const names = ["Food & Drinks", "Transport", "Rent"];

test("the suggestion must be one of the names we sent", () => {
  assert.equal(parseCategorySuggestion('{"category":"Transport"}', names), "Transport");
  assert.equal(parseCategorySuggestion('{"category":"  rent "}', names), "Rent");
});

test("returns the canonical spelling, not what the model typed", () => {
  assert.equal(parseCategorySuggestion('{"category":"food & drinks"}', names), "Food & Drinks");
});

test("an empty or unknown answer means no suggestion", () => {
  assert.equal(parseCategorySuggestion('{"category":""}', names), null);
  assert.equal(parseCategorySuggestion('{"category":"Crypto"}', names), null);
  assert.equal(parseCategorySuggestion('{"other":"Transport"}', names), null);
  assert.equal(parseCategorySuggestion("not json", names), null);
  assert.equal(parseCategorySuggestion("", names), null);
});

test("the schema locks the model to the names plus the none marker", () => {
  const schema = categorySchema(names) as {
    properties: { category: { enum: string[] } };
  };
  assert.deepEqual(schema.properties.category.enum, [...names, NO_CATEGORY]);
});

test("the none marker is never returned as a category", () => {
  assert.equal(parseCategorySuggestion(`{"category":"${NO_CATEGORY}"}`, names), null);
});

test("the category prompt carries the note and forbids new names", () => {
  const prompt = buildCategoryPrompt("Highlands Coffee", "expense", names);
  assert.match(prompt, /Highlands Coffee/);
  assert.match(prompt, /Never invent a new name/);
});

test("the summary prompt hands over numbers and forbids arithmetic", () => {
  const prompt = buildSummaryPrompt(
    {
      month: "2026-09",
      income: "20.000.000 ₫",
      expenses: "31.000.000 ₫",
      leftOver: "-11.000.000 ₫",
      savingsRate: "-55%",
      topCategories: [{ name: "Rent", total: "6.000.000 ₫" }],
      budgets: [{ name: "Rent", spent: "6.000.000 ₫", limit: "6.000.000 ₫" }],
      insights: ["Shopping is over budget"],
    },
    "vi-VN"
  );

  assert.match(prompt, /vi-VN/);
  assert.match(prompt, /Never invent or recalculate/);
  assert.match(prompt, /Shopping is over budget/);
});

test("the summary is trimmed, capped and refused when malformed", () => {
  assert.equal(parseSummary('{"summary":"  You   spent  a lot. "}'), "You spent a lot.");
  assert.equal(parseSummary('{"summary":""}'), null);
  assert.equal(parseSummary("[]"), null);
  assert.equal(parseSummary("nope"), null);

  const long = parseSummary(JSON.stringify({ summary: "x".repeat(900) }));
  assert.equal(long?.length, 701);
  assert.ok(long?.endsWith("…"));
});

test("the summary schema asks for one string", () => {
  assert.deepEqual(SUMMARY_SCHEMA.required, ["summary"]);
});
