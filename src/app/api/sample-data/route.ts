import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/money/period";
import { hasSampleData, loadSampleData, removeSampleData } from "@/lib/sample-data";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await hasSampleData(user.id)) {
    return NextResponse.json({ error: "Sample data is already loaded" }, { status: 409 });
  }

  const [own] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), isNull(transactions.source)))
    .limit(1);

  if (own) {
    return NextResponse.json(
      { error: "You already have your own entries, so there is nothing to demonstrate" },
      { status: 409 }
    );
  }

  const created = await loadSampleData(user.id, user.currency, todayKey());
  return NextResponse.json({ created }, { status: 201 });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const removed = await removeSampleData(user.id);
  return NextResponse.json({ removed });
}
