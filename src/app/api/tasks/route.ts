import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, reminders, entities } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

const VALID_PRIORITY = ["low", "medium", "high", "urgent"] as const;
type TaskPriority = (typeof VALID_PRIORITY)[number];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });
  if (!membership) {
    return NextResponse.json({ tasks: [] });
  }

  const list = await db.query.tasks.findMany({
    where: (t, { eq }) => eq(t.householdId, membership.householdId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json({ tasks: list });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });
  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  let body: {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
    entityId?: string | null;
    reminderId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const priority: TaskPriority = VALID_PRIORITY.includes(body.priority as TaskPriority)
    ? (body.priority as TaskPriority)
    : "medium";

  let entityId: string | null = null;
  let dueDate: Date | null = null;
  let reminderRow: { id: string; title: string; triggerAt: Date } | null = null;

  if (body.reminderId) {
    reminderRow = await db.query.reminders.findFirst({
      where: (r, { and, eq }) =>
        and(eq(r.id, body.reminderId!), eq(r.householdId, membership.householdId)),
    }) ?? null;
    if (!reminderRow) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    dueDate = new Date(reminderRow.triggerAt);
  }

  if (body.entityId) {
    const entity = await db.query.entities.findFirst({
      where: (e, { and, eq }) =>
        and(eq(e.id, body.entityId!), eq(e.householdId, membership.householdId)),
    });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    entityId = entity.id;
  } else if (reminderRow) {
    // inherit entity from reminder
    const reminderWithEntity = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminderRow.id),
    });
    entityId = reminderWithEntity?.entityId ?? null;
  }

  if (body.dueDate) {
    const d = new Date(body.dueDate);
    if (!isNaN(d.getTime())) dueDate = d;
  }

  const [task] = await db
    .insert(tasks)
    .values({
      householdId: membership.householdId,
      title: body.title.trim(),
      description: body.description ?? null,
      priority,
      dueDate,
      entityId,
      ownerId: session.user.id,
      createdBy: session.user.id,
    })
    .returning();

  if (reminderRow) {
    await db
      .update(reminders)
      .set({ taskId: task.id, status: "dismissed" })
      .where(eq(reminders.id, reminderRow.id));
  }

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: reminderRow ? "task_created_from_reminder" : "task_created",
    targetEntity: entityId ?? undefined,
    targetType: "task",
    reason: reminderRow
      ? `Created task "${task.title}" from reminder "${reminderRow.title}"`
      : `Created task "${task.title}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ task }, { status: 201 });
}
