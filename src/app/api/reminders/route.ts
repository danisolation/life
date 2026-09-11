import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });
  if (!membership) {
    return NextResponse.json({ reminders: [] });
  }

  const status = new URL(request.url).searchParams.get("status");

  const list = await db.query.reminders.findMany({
    where: (r, { and, eq }) =>
      status
        ? and(eq(r.householdId, membership.householdId), eq(r.status, status as "scheduled"))
        : eq(r.householdId, membership.householdId),
    orderBy: (r, { asc }) => [asc(r.triggerAt)],
    with: { entity: true },
  });

  return NextResponse.json({ reminders: list });
}
