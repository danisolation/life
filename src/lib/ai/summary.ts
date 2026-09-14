export type SummaryFacts = {
  month: string;
  income: string;
  expenses: string;
  leftOver: string;
  savingsRate: string;
  topCategories: { name: string; total: string }[];
  budgets: { name: string; spent: string; limit: string }[];
  insights: string[];
};

export function buildSummaryPrompt(facts: SummaryFacts, locale: string): string {
  const lines = [
    `Write a short monthly money review in the language for the locale ${locale}.`,
    "Use only the numbers below. Never invent or recalculate a number, never mention products or give financial advice.",
    "Two to four sentences, plain language, no headings and no bullet lists.",
    "",
    `Month: ${facts.month}`,
    `Income: ${facts.income}`,
    `Spending: ${facts.expenses}`,
    `Left over: ${facts.leftOver}`,
    `Savings rate: ${facts.savingsRate}`,
    "",
    "Biggest categories:",
    ...facts.topCategories.map((row) => `- ${row.name}: ${row.total}`),
    "",
    "Budgets:",
    ...facts.budgets.map((row) => `- ${row.name}: ${row.spent} of ${row.limit}`),
    "",
    "Already detected from the numbers:",
    ...facts.insights.map((line) => `- ${line}`),
  ];

  return lines.join("\n");
}

export const SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: { summary: { type: "STRING" } },
  required: ["summary"],
} as const;

export function parseSummary(text: string): string | null {
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const summary = (raw as Record<string, unknown>).summary;
  if (typeof summary !== "string") return null;

  const cleaned = summary.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  return cleaned.length > 700 ? `${cleaned.slice(0, 700).trimEnd()}…` : cleaned;
}
