import { parseAmount } from "./amount.ts";

export type QuickEntry = {
  kind: "income" | "expense";
  amount: string;
  note: string | null;
};

const TOKEN = /[+-]?\d[\d.,]*(?:\s?(?:k|tr|m)(?![a-z]))?/i;

export function parseQuickEntry(text: string, currency: string): QuickEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = TOKEN.exec(trimmed);
  if (!match) return null;

  const raw = match[0].replace(/\s+/g, "");
  const kind = raw.startsWith("+") ? "income" : "expense";
  const amount = raw.replace(/^[+-]/, "");

  try {
    parseAmount(amount, currency);
  } catch {
    return null;
  }

  const note = `${trimmed.slice(0, match.index)} ${trimmed.slice(match.index + match[0].length)}`
    .replace(/\s+/g, " ")
    .trim();

  return { kind, amount, note: note || null };
}
