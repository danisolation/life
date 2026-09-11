"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: Date;
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
  const urgentTasks = tasks.filter((t) => t.priority === "urgent" || t.priority === "high");
  const urgentReminders = reminders.filter((r) => {
    const daysUntil = Math.ceil(
      (new Date(r.triggerAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 7;
  });

  const hasUrgentItems = urgentTasks.length > 0 || urgentReminders.length > 0;

  if (!hasUrgentItems) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <AlertCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">All clear!</p>
              <p className="text-sm text-green-600">
                No urgent items need your attention right now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-orange-800">
          <AlertTriangle className="h-4 w-4" />
          Requires Attention
        </CardTitle>
        <CardDescription className="text-orange-600">
          {urgentTasks.length + urgentReminders.length} item(s) need action
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {urgentReminders.slice(0, 2).map((reminder) => {
          const daysUntil = Math.ceil(
            (new Date(reminder.triggerAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div
              key={reminder.id}
              className="flex items-center justify-between rounded bg-white/60 p-2"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">{reminder.title}</span>
              </div>
              <Badge variant={daysUntil <= 3 ? "destructive" : "secondary"}>
                {daysUntil} day{daysUntil !== 1 ? "s" : ""}
              </Badge>
            </div>
          );
        })}
        {urgentTasks.slice(0, 2).map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded bg-white/60 p-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{task.title}</span>
            </div>
            <Badge variant={task.priority === "urgent" ? "destructive" : "default"}>
              {task.priority}
            </Badge>
          </div>
        ))}
        <Link
          href="/tasks"
          className="block pt-1 text-center text-sm font-medium text-orange-700 hover:underline"
        >
          View all tasks
        </Link>
      </CardContent>
    </Card>
  );
}
