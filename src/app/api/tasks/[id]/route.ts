import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

const VALID_STATUS = ["pending", "in_progress", "completed", "cancelled"] as const;
const VALID_PRIORITY = ["low", "medium", "high", "urgent"] as const;
type TaskStatus = (typeof VALID_STATUS)[number];
type TaskPriority = (typeof VALID_PRIORITY)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const task = await db.query.tasks.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.id, id), eq(t.householdId, membership.householdId)),
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.title === "string" && body.title.trim()) {
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITY.includes(body.priority as TaskPriority)) {
      return NextResponse.json({ error: `Invalid priority: ${body.priority}` }, { status: 400 });
    }
    updates.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status as TaskStatus)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updates.status = body.status;
    updates.completedAt = body.status === "completed" ? new Date() : null;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === "") {
      updates.dueDate = null;
    } else {
      const d = new Date(body.dueDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
      }
      updates.dueDate = d;
    }
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: body.status ? `task_${body.status}` : "task_updated",
    targetEntity: task.entityId ?? undefined,
    targetType: "task",
    reason: body.status
      ? `Task "${task.title}" → ${body.status}`
      : `Updated task "${task.title}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const task = await db.query.tasks.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.id, id), eq(t.householdId, membership.householdId)),
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "task_deleted",
    targetEntity: task.entityId ?? undefined,
    targetType: "task",
    reason: `Deleted task "${task.title}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ message: "Task deleted" });
}
