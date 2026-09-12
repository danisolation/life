"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadlineList, type DeadlineItem } from "@/components/deadlines/deadline-list";
import { DeadlineCalendar } from "@/components/deadlines/deadline-calendar";

export function DeadlineViews({ reminders }: { reminders: DeadlineItem[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label="Deadline view"
        className="flex items-center gap-1"
      >
        <Button
          variant={view === "list" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
        >
          <List aria-hidden className="mr-1 h-3.5 w-3.5" />
          List
        </Button>
        <Button
          variant={view === "calendar" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("calendar")}
          aria-pressed={view === "calendar"}
        >
          <CalendarDays aria-hidden className="mr-1 h-3.5 w-3.5" />
          Calendar
        </Button>
      </div>

      {view === "list" ? (
        <DeadlineList reminders={reminders} />
      ) : (
        <DeadlineCalendar reminders={reminders} />
      )}
    </div>
  );
}
