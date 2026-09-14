export function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
}

export function formatMonthLabel(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00`)
  );
}

export function formatDayLabel(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" }).format(
    new Date(`${value}T00:00:00`)
  );
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
