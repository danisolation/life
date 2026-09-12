"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Calendar, MoreHorizontal, Trash2, Loader2, ExternalLink, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, priorityTone, taskStatusTone } from "@/components/status-badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  entityName: string | null;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateTask(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not update task");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update task");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTask(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete task");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete task");
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Create one, or convert a deadline into a task."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {tasks.map((task) => {
        const done = task.status === "completed";
        const busy = busyId === task.id;
        return (
          <Card key={task.id} className={done ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={done}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    updateTask(task.id, {
                      status: checked ? "completed" : "pending",
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}
                    >
                      {task.title}
                    </h3>
                    <StatusBadge tone={taskStatusTone(task.status)}>
                      {task.status === "in_progress"
                        ? "In Progress"
                        : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </StatusBadge>
                    {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <StatusBadge tone={priorityTone(task.priority)}>
                      <span className="capitalize">{task.priority}</span>
                    </StatusBadge>
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {task.entityId && task.entityType && (
                      <Link
                        href={`/life/${task.entityType}/${task.entityId}`}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{task.entityName ?? "linked item"}</span>
                      </Link>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => updateTask(task.id, { status: "in_progress" })}
                    >
                      Mark in progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateTask(task.id, { status: "pending" })}>
                      Mark pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateTask(task.id, { status: "cancelled" })}
                    >
                      Cancel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
