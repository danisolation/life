import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and workflows.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <TaskList tasks={userTasks} />
    </div>
  );
}
