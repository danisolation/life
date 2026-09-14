const ZERO_DECIMAL = new Set(["VND", "JPY", "KRW", "IDR", "CLP", "ISK"]);
const CURRENCY_NOISE = /[₫đ$€£¥]|\b(vnd|usd|eur|jpy|krw|gbp)\b/g;

export function minorUnitDigits(currency: string): 0 | 2 {
  return ZERO_DECIMAL.has(currency.trim().toUpperCase()) ? 0 : 2;
}

function parseSuffixed(raw: string, digits: 0 | 2): number | null {
  const match = /^(\d+(?:[.,]\d+)?)(k|tr|m)$/.exec(raw);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  const multiplier = match[2] === "k" ? 1_000 : 1_000_000;
  const major = Math.round(value * multiplier);
  return digits === 0 ? major : major * 100;
}

function parseZeroDecimal(raw: string): number | null {
  const parts = raw.split(/[.,]/);
  const last = parts[parts.length - 1] ?? "";
  if (parts.length > 1 && last.length <= 2) return null;
  const digitsOnly = raw.replace(/[.,]/g, "");
  if (!/^\d+$/.test(digitsOnly)) return null;
  return Number(digitsOnly);
}

function parseTwoDecimal(raw: string): number | null {
  const parts = raw.split(/[.,]/);
  if (parts.some((part) => part === "")) return null;
  const last = parts[parts.length - 1];
  const hasDecimal =
    parts.length > 1 &&
    last.length <= 2 &&
    parts.slice(1, -1).every((part) => part.length === 3);
  if (!hasDecimal && parts.slice(1).some((part) => part.length !== 3)) return null;
  const integerPart = hasDecimal ? parts.slice(0, -1).join("") : parts.join("");
  const fractionPart = hasDecimal ? last.padEnd(2, "0") : "00";
  if (!/^\d+$/.test(integerPart)) return null;
  return Number(integerPart) * 100 + Number(fractionPart);
}

export function parseAmount(input: string, currency: string): number {
  const digits = minorUnitDigits(currency);
  const raw = input
    .trim()
    .toLowerCase()
    .replace(CURRENCY_NOISE, "")
    .replace(/\s+/g, "");
  if (!raw) throw new Error("Amount is required");
  if (raw.includes("-")) throw new Error("Amount must be positive");

  const parsed =
    parseSuffixed(raw, digits) ?? (digits === 0 ? parseZeroDecimal(raw) : parseTwoDecimal(raw));
  if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid amount");
  }
  return parsed;
}

function format(minor: number, currency: string, locale: string, compact: boolean): string {
  const digits = minorUnitDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(minor / (digits === 0 ? 1 : 100));
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  return format(minor, currency, locale, false);
}

export function formatCompactMoney(minor: number, currency: string, locale: string): string {
  return format(minor, currency, locale, true);
}
