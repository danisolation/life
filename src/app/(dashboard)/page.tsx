import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities, tasks, reminders } from "@/lib/db/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { LifeAdminScoreCard } from "@/components/home/score-card";
import { UpcomingDeadlines } from "@/components/home/upcoming-deadlines";
import { PriorityActions } from "@/components/home/priority-actions";
import { QuickStats } from "@/components/home/quick-stats";
import { requireAuth } from "@/lib/session";

export default async function HomePage() {
  const session = await requireAuth();

  // Get user's household
  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome to Life Admin OS</h1>
        <p className="text-muted-foreground">
          Setting up your household...
        </p>
      </div>
    );
  }

  const householdId = membership.householdId;

  // Fetch upcoming deadlines (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingReminders = await db.query.reminders.findMany({
    where: (rem, { and, eq, lte, gte }) =>
      and(
        eq(rem.householdId, householdId),
        eq(rem.status, "scheduled"),
        gte(rem.triggerAt, now),
        lte(rem.triggerAt, thirtyDaysFromNow)
      ),
    orderBy: (rem, { asc }) => [asc(rem.triggerAt)],
    limit: 5,
  });

  // Fetch pending tasks
  const pendingTasks = await db.query.tasks.findMany({
    where: (tasks, { and, eq }) =>
      and(eq(tasks.householdId, householdId), eq(tasks.status, "pending")),
    orderBy: (tasks, { asc }) => [asc(tasks.dueDate)],
    limit: 5,
  });

  // Count entities by type
  const allEntities = await db.query.entities.findMany({
    where: (ent, { and, eq }) => and(eq(ent.householdId, membership.householdId)),
  });

  const subscriptions = allEntities.filter((e) => e.type === "subscription");
  const warranties = allEntities.filter((e) => e.type === "warranty");

  // Calculate a simple health score
  const healthScore = calculateHealthScore(
    allEntities,
    pendingTasks,
    upcomingReminders
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Good {getGreeting()}, {session.user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* Health Score */}
      <LifeAdminScoreCard score={healthScore} />

      {/* Priority Actions */}
      <PriorityActions reminders={upcomingReminders} tasks={pendingTasks} />

      {/* Quick Stats */}
      <QuickStats
        subscriptionsCount={subscriptions.length}
        warrantiesCount={warranties.length}
        upcomingCount={upcomingReminders.length}
        tasksCount={pendingTasks.length}
      />

      {/* Upcoming Deadlines */}
      <UpcomingDeadlines reminders={upcomingReminders} />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function calculateHealthScore(
  entities: Array<{ type: string }>,
  tasks: unknown[],
  reminders: unknown[]
): number {
  // Simple scoring algorithm
  let score = 70; // Base score

  // Bonus for having entities tracked
  score += Math.min(entities.length * 2, 10);

  // Penalty for overdue tasks
  score -= Math.min(tasks.length * 3, 15);

  // Bonus for staying on top of deadlines
  if (reminders.length <= 3) score += 10;
  else if (reminders.length <= 5) score += 5;

  return Math.max(0, Math.min(100, score));
}
