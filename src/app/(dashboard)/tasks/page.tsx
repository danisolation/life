import { db } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { requireAuth } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";

export default async function TasksPage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Setting up your household...</p>
      </div>
    );
  }

  const userTasks = await db.query.tasks.findMany({
    where: (t, { eq }) => eq(t.householdId, membership.householdId),
    orderBy: (t, { asc, desc }) => [asc(t.status), desc(t.createdAt)],
    with: { entity: true },
  });

  const serialized = userTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    entityId: t.entity?.id ?? null,
    entityType: t.entity?.type ?? null,
    entityName: t.entity?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your tasks and workflows."
        action={<TaskCreateDialog />}
      />

      <TaskList tasks={serialized} />
    </div>
  );
}
