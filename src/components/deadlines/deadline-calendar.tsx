"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, urgencyTone } from "@/components/status-badge";
import { CalendarDays } from "lucide-react";
import type { DeadlineItem } from "@/components/deadlines/deadline-list";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function DeadlineCalendar({ reminders }: { reminders: DeadlineItem[] }) {
  const [selected, setSelected] = useState<Date | undefined>(undefined);

  // Dismissed reminders are excluded: the calendar shows what still matters.
  const active = reminders.filter((r) => r.status !== "dismissed");

  const byDay = new Map<string, DeadlineItem[]>();
  const overdue: Date[] = [];
  const soon: Date[] = [];
  const later: Date[] = [];

  for (const reminder of active) {
    const when = new Date(reminder.triggerAt);
    const key = dayKey(when);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(reminder);
    else byDay.set(key, [reminder]);

    if (reminder.days < 0) overdue.push(when);
    else if (reminder.days <= 7) soon.push(when);
    else later.push(when);
  }

  const selectedItems = selected ? (byDay.get(dayKey(selected)) ?? []) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-4">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ overdue, soon, later }}
            modifiersClassNames={{
              overdue: "bg-destructive/15",
              soon: "bg-warning-muted",
              later: "bg-info-muted",
            }}
          />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded bg-destructive/15" />
              Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded bg-warning-muted" />
              Within a week
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded bg-info-muted" />
              Later
            </span>
          </div>
        </CardContent>
      </Card>

      {!selected ? (
        <p className="text-center text-sm text-muted-foreground">
          Pick a day to see what falls on it.
        </p>
      ) : selectedItems.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarDays}
              title="Nothing due that day"
              description="Pick another day to see its deadlines."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {selectedItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.entityName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.entityName}
                    </p>
                  )}
                </div>
                <StatusBadge tone={urgencyTone(item.days)}>
                  {item.days < 0
                    ? `${Math.abs(item.days)}d overdue`
                    : item.days === 0
                      ? "today"
                      : `${item.days}d`}
                </StatusBadge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
