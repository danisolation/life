import { addDays, daysInMonth, shiftMonth, weekdayOf } from "./period.ts";

export type RecurringFrequency = "monthly" | "weekly";

export type RecurringRuleLike = {
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  weekday: number | null;
  startsOn: string;
  lastGeneratedOn: string | null;
};

const BACKLOG_MONTHS = 12;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function earliestBacklog(today: string): string {
  return `${shiftMonth(today.slice(0, 7), -BACKLOG_MONTHS)}-01`;
}

export function dueDatesFor(rule: RecurringRuleLike, today: string): string[] {
  const floor = rule.lastGeneratedOn;
  const from = earliestBacklog(today);
  const dates: string[] = [];

  const keep = (date: string): boolean =>
    date >= rule.startsOn &&
    date <= today &&
    date >= from &&
    (!floor || date > floor);

  if (rule.frequency === "monthly") {
    const wanted = rule.dayOfMonth ?? 1;
    let month = rule.startsOn.slice(0, 7);
    const endMonth = today.slice(0, 7);

    while (month <= endMonth) {
      const day = Math.min(wanted, daysInMonth(month));
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (keep(date)) dates.push(date);
      month = shiftMonth(month, 1);
    }

    return dates;
  }

  const wantedWeekday = rule.weekday ?? 1;
  let cursor = rule.startsOn;
  while (weekdayOf(cursor) !== wantedWeekday) cursor = addDays(cursor, 1);

  while (cursor <= today) {
    if (keep(cursor)) dates.push(cursor);
    cursor = addDays(cursor, 7);
  }

  return dates;
}

export function nextDueDate(rule: RecurringRuleLike, today: string): string {
  if (rule.frequency === "monthly") {
    const wanted = rule.dayOfMonth ?? 1;
    const startMonth = rule.startsOn.slice(0, 7) > today.slice(0, 7)
      ? rule.startsOn.slice(0, 7)
      : today.slice(0, 7);

    for (let index = 0; index < 120; index += 1) {
      const month = shiftMonth(startMonth, index);
      const date = `${month}-${pad(Math.min(wanted, daysInMonth(month)))}`;
      if (date > today && date >= rule.startsOn) return date;
    }

    return `${shiftMonth(startMonth, 120)}-${pad(Math.min(wanted, 28))}`;
  }

  const wantedWeekday = rule.weekday ?? 1;
  let cursor = addDays(today, 1);
  while (weekdayOf(cursor) !== wantedWeekday) cursor = addDays(cursor, 1);
  while (cursor < rule.startsOn) cursor = addDays(cursor, 7);
  return cursor;
}
