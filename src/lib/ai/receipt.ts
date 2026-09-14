import { parseAmount } from "../money/amount.ts";

export type ReceiptDraft = {
  amount: string;
  occurredOn: string;
  note: string;
  kind: "income" | "expense";
};

export const RECEIPT_PROMPT = [
  "You read a photo of a receipt or invoice and return the fields as JSON.",
  "Rules:",
  "- amount: the final total the customer paid, digits only, no currency symbol, no thousands separators.",
  "- date: the date printed on the receipt as YYYY-MM-DD. Empty string if you cannot find one.",
  "- merchant: the shop or service name, at most 60 characters. Use the main line item if there is no name.",
  "- kind: 'expense' normally, 'income' only for a refund or money received.",
  "Never guess an amount: if the total is unreadable, return an empty amount.",
].join("\n");

export const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    amount: { type: "STRING" },
    date: { type: "STRING" },
    merchant: { type: "STRING" },
    kind: { type: "STRING", enum: ["expense", "income"] },
  },
  required: ["amount", "merchant"],
} as const;

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseReceiptResponse(
  text: string,
  currency: string,
  today: string
): ReceiptDraft | null {
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(stripFences(text));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;

  const fields = raw as Record<string, unknown>;
  const amountText = typeof fields.amount === "string" ? fields.amount.trim() : "";
  if (!amountText) return null;

  try {
    parseAmount(amountText, currency);
  } catch {
    return null;
  }

  const date = typeof fields.date === "string" ? fields.date.trim() : "";
  const merchant = typeof fields.merchant === "string" ? fields.merchant.trim() : "";
  const kind = fields.kind === "income" ? "income" : "expense";

  return {
    amount: amountText,
    occurredOn: isDate(date) ? date : today,
    note: merchant.slice(0, 200),
    kind,
  };
}
