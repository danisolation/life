import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

const VALID_STATUS = ["scheduled", "sent", "dismissed", "snoozed"] as const;
type ReminderStatus = (typeof VALID_STATUS)[number];

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
  const reminder = await db.query.reminders.findFirst({
    where: (r, { and, eq }) =>
      and(eq(r.id, id), eq(r.householdId, membership.householdId)),
  });
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  let body: { status?: string; snoozeDays?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.snoozeDays !== undefined) {
    if (typeof body.snoozeDays !== "number" || body.snoozeDays <= 0) {
      return NextResponse.json({ error: "snoozeDays must be a positive number" }, { status: 400 });
    }
    const base = new Date(reminder.triggerAt);
    updates.triggerAt = new Date(base.getTime() + body.snoozeDays * 24 * 60 * 60 * 1000);
    updates.status = "scheduled";
  }

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status as ReminderStatus)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(reminders)
    .set(updates)
    .where(eq(reminders.id, id))
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: body.snoozeDays ? "reminder_snoozed" : "reminder_status_changed",
    targetEntity: reminder.entityId ?? undefined,
    targetType: "reminder",
    reason: body.snoozeDays
      ? `Snoozed reminder "${reminder.title}" by ${body.snoozeDays} days`
      : `Set reminder "${reminder.title}" status to ${body.status}`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ reminder: updated });
}
