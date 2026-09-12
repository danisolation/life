const DAY_MS = 1000 * 60 * 60 * 24;

export type Urgency = "overdue" | "today" | "soon" | "later";

export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(date: Date | string, today: Date): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function urgencyOf(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}
