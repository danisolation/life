export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CURRENCY_RE = /^[A-Z]{3}$/;
export const LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function firstDayOf(month: string): string {
  return `${month}-01`;
}
