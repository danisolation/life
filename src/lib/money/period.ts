function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function todayKey(date: Date = new Date()): string {
  return `${monthKey(date)}-${pad(date.getDate())}`;
}

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(month))}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export function daysElapsed(month: string, today: string): number {
  return monthKey(new Date(`${today}T00:00:00`)) === month
    ? Number(today.slice(8, 10))
    : daysInMonth(month);
}
