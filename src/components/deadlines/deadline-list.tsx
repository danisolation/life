"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";
import { urgencyOf } from "@/lib/deadline-urgency";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, urgencyTone } from "@/components/status-badge";
import {
  Clock,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ListChecks,
  X,
  MoreHorizontal,
  Loader2,
  Info,
  RotateCcw,
} from "lucide-react";

export interface DeadlineItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: string;
  status: string;
  days: number;
  entityId: string | null;
  entityType: string | null;
  entityName: string | null;
}

interface DeadlineListProps {
  reminders: DeadlineItem[];
}

interface Group {
  key: string;
  label: string;
  icon: React.ReactNode;
  className: string;
  items: DeadlineItem[];
}

export function DeadlineList({ reminders }: DeadlineListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo<Group[]>(() => {
    const overdue: DeadlineItem[] = [];
    const week: DeadlineItem[] = [];
    const month: DeadlineItem[] = [];
    const later: DeadlineItem[] = [];
    const dismissed: DeadlineItem[] = [];

    for (const r of reminders) {
      if (r.status === "dismissed") {
        dismissed.push(r);
        continue;
      }

      switch (urgencyOf(r.days)) {
        case "overdue":
          overdue.push(r);
          break;
        case "today":
        case "soon":
          week.push(r);
          break;
        default:
          if (r.days <= 30) month.push(r);
          else later.push(r);
      }
    }

    return [
      {
        key: "overdue",
        label: "Overdue",
        icon: <AlertTriangle aria-hidden className="h-4 w-4" />,
        className: "border-destructive/40 bg-destructive/5",
        items: overdue,
      },
      {
        key: "week",
        label: "This week",
        icon: <Clock aria-hidden className="h-4 w-4" />,
        className: "border-warning-muted bg-warning-muted",
        items: week,
      },
      {
        key: "month",
        label: "This month",
        icon: <CalendarClock aria-hidden className="h-4 w-4" />,
        className: "border-info-muted bg-info-muted",
        items: month,
      },
      {
        key: "later",
        label: "Later",
        icon: <CalendarDays aria-hidden className="h-4 w-4" />,
        className: "",
        items: later,
      },
      {
        key: "dismissed",
        label: "Dismissed",
        icon: <X aria-hidden className="h-4 w-4" />,
        className: "opacity-70",
        items: dismissed,
      },
    ].filter((g) => g.items.length > 0);
  }, [reminders]);

  async function act(id: string, payload: { status?: string; snoozeDays?: number }) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function createTask(item: DeadlineItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.message,
          reminderId: item.id,
          priority: item.days <= 7 ? "high" : "medium",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not create task");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not create task");
    } finally {
      setBusyId(null);
    }
  }

  const total = reminders.length;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded border border-destructive bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {total === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              title="No deadlines yet"
              description="Upload documents to your Inbox to start tracking warranties, contracts, and renewals."
              action={<Button render={<Link href="/inbox" />}>Go to Inbox</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="flex items-center gap-2">
              {group.icon}
              <h2 className="font-semibold">{group.label}</h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                ({group.items.length})
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const d = item.days;
                const busy = busyId === item.id;
                const entityConfig = item.entityType
                  ? ENTITY_TYPE_CONFIG[item.entityType as EntityType]
                  : null;

                return (
                  <Card key={item.id} className={group.className}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            {item.status === "dismissed" ? (
                              <StatusBadge tone="neutral">Dismissed</StatusBadge>
                            ) : (
                              <StatusBadge tone={urgencyTone(d)}>
                                {d < 0
                                  ? `${Math.abs(d)}d overdue`
                                  : d === 0
                                    ? "today"
                                    : `${d}d`}
                              </StatusBadge>
                            )}
                            {item.type === "preparation" && (
                              <Badge variant="outline">prep</Badge>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {new Date(item.triggerAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {item.entityId && entityConfig && (
                              <>
                                {" · "}
                                <Link
                                  href={`/life/${item.entityType}/${item.entityId}`}
                                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                                >
                                  <entityConfig.icon aria-hidden className="h-3 w-3" />
                                  {item.entityName}
                                </Link>
                              </>
                            )}
                          </p>

                          {item.message && (
                            <div className="mt-2 flex items-start gap-2 rounded bg-background/60 p-2 text-xs text-muted-foreground">
                              <Info aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{item.message}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {item.status === "dismissed" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => act(item.id, { status: "scheduled" })}
                              disabled={busy}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="mr-1 h-3 w-3" />
                                  Reopen
                                </>
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createTask(item)}
                                disabled={busy}
                              >
                                {busy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <ListChecks className="mr-1 h-3 w-3" />
                                    Task
                                  </>
                                )}
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="More actions"
                                    />
                                  }
                                >
                                  <MoreHorizontal aria-hidden className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => act(item.id, { snoozeDays: 1 })}
                                  >
                                    Snooze 1 day
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => act(item.id, { snoozeDays: 7 })}
                                  >
                                    Snooze 1 week
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => act(item.id, { snoozeDays: 30 })}
                                  >
                                    Snooze 1 month
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => act(item.id, { status: "dismissed" })}
                                disabled={busy}
                                aria-label="Dismiss"
                              >
                                <X aria-hidden className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
