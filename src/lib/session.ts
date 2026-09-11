import { auth } from "@/lib/auth";

/**
 * Get the current user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Get the current user's household ID.
 * Returns null if not authenticated or no household.
 */
export async function getCurrentHouseholdId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { db } = await import("@/lib/db");
  const { householdMembers } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq: eqFn }) => eqFn(members.userId, session.user!.id),
  });

  return membership?.householdId ?? null;
}

/**
 * Require authentication - throws if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
