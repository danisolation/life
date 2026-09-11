import { db } from "@/lib/db";
import { TaskList } from "@/components/tasks/task-list";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { requireAuth } from "@/lib/session";

export default async function TasksPage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and workflows.
          </p>
        </div>
        <TaskCreateDialog />
      </div>

      <TaskList tasks={serialized} />
    </div>
  );
}
