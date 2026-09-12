"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, urgencyTone } from "@/components/status-badge";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: Date;
  days: number;
}

interface UpcomingDeadlinesProps {
  reminders: Reminder[];
}

export function UpcomingDeadlines({ reminders }: UpcomingDeadlinesProps) {
  const sortedReminders = [...reminders].sort(
    (a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar aria-hidden className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
        <CardDescription>Important dates in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedReminders.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming deadlines"
            description="Upload documents to track warranties, subscriptions, and more."
          />
        ) : (
          <div className="space-y-3">
            {sortedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(reminder.triggerAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <StatusBadge tone={urgencyTone(reminder.days)}>
                  {reminder.days} day{reminder.days !== 1 ? "s" : ""}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/deadlines"
          className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all deadlines
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
