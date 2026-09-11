import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { DeadlineList } from "@/components/deadlines/deadline-list";

export default async function DeadlinesPage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Deadlines</h1>
        <p className="text-muted-foreground">Setting up your household...</p>
      </div>
    );
  }

  const reminderList = await db.query.reminders.findMany({
    where: (r, { and, eq, ne }) =>
      and(eq(r.householdId, membership.householdId), ne(r.status, "dismissed")),
    orderBy: (r, { asc }) => [asc(r.triggerAt)],
    with: { entity: true },
  });

  const serialized = reminderList.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    triggerAt: r.triggerAt.toISOString(),
    status: r.status,
    entityId: r.entity?.id ?? null,
    entityType: r.entity?.type ?? null,
    entityName: r.entity?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deadlines</h1>
        <p className="text-muted-foreground">
          Every date that matters, with what happens if you do nothing.
        </p>
      </div>
      <DeadlineList reminders={serialized} />
    </div>
  );
}
