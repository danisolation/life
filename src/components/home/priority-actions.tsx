"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, urgencyTone, priorityTone } from "@/components/status-badge";
import { AlertCircle, AlertTriangle, CircleCheck, Clock } from "lucide-react";
import Link from "next/link";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: Date;
  days: number;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
}

interface PriorityActionsProps {
  reminders: Reminder[];
  tasks: Task[];
}

export function PriorityActions({ reminders, tasks }: PriorityActionsProps) {
  const urgentTasks = tasks.filter(
    (t) => t.priority === "urgent" || t.priority === "high"
  );
  const urgentReminders = reminders.filter((r) => r.days <= 7);

  const hasUrgentItems = urgentTasks.length > 0 || urgentReminders.length > 0;

  if (!hasUrgentItems) {
    return (
      <Card className="border-success-muted bg-success-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60">
              <CircleCheck aria-hidden className="h-5 w-5 text-success-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-success-muted-foreground">All clear</p>
              <p className="text-sm text-success-muted-foreground">
                No urgent items need your attention right now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning-muted bg-warning-muted">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-warning-muted-foreground">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          Requires attention
        </CardTitle>
        <CardDescription className="text-warning-muted-foreground">
          {urgentTasks.length + urgentReminders.length} item(s) need action
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {urgentReminders.slice(0, 2).map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between rounded bg-background/60 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Clock aria-hidden className="h-4 w-4 shrink-0 text-warning-muted-foreground" />
              <span className="truncate text-sm">{reminder.title}</span>
            </div>
            <StatusBadge tone={urgencyTone(reminder.days)}>
              {reminder.days} day{reminder.days !== 1 ? "s" : ""}
            </StatusBadge>
          </div>
        ))}
        {urgentTasks.slice(0, 2).map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded bg-background/60 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-warning-muted-foreground" />
              <span className="truncate text-sm">{task.title}</span>
            </div>
            <StatusBadge tone={priorityTone(task.priority)}>
              <span className="capitalize">{task.priority}</span>
            </StatusBadge>
          </div>
        ))}
        <Link
          href="/tasks"
          className="block pt-1 text-center text-sm font-medium text-warning-muted-foreground hover:underline"
        >
          View all tasks
        </Link>
      </CardContent>
    </Card>
  );
}
