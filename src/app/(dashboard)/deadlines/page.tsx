import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { DeadlineViews } from "@/components/deadlines/deadline-views";
import { PageHeader } from "@/components/layout/page-header";
import { daysUntil, startOfToday } from "@/lib/deadline-urgency";

export default async function DeadlinesPage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deadlines</h1>
        <p className="text-muted-foreground">Setting up your household...</p>
      </div>
    );
  }

  const reminderList = await db.query.reminders.findMany({
    where: (r, { eq }) => eq(r.householdId, membership.householdId),
    orderBy: (r, { asc }) => [asc(r.triggerAt)],
    with: { entity: true },
  });

  const today = startOfToday();
  const serialized = reminderList.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    triggerAt: r.triggerAt.toISOString(),
    status: r.status,
    days: daysUntil(r.triggerAt, today),
    entityId: r.entity?.id ?? null,
    entityType: r.entity?.type ?? null,
    entityName: r.entity?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        description="Every date that matters, with what happens if you do nothing."
      />
      <DeadlineViews reminders={serialized} />
    </div>
  );
}
