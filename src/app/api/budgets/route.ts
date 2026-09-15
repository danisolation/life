import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, categories } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { firstDayOf, isMonth, readJson } from "@/lib/validate";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const month = typeof body.month === "string" ? body.month : "";
  if (!isMonth(month)) {
    return NextResponse.json({ error: "Month must look like 2026-09" }, { status: 400 });
  }

  if (!Array.isArray(body.entries)) {
    return NextResponse.json({ error: "Entries must be a list" }, { status: 400 });
  }

  const ownCategories = await db.query.categories.findMany({
    where: eq(categories.userId, user.id),
  });
  const ownIds = new Set(ownCategories.map((category) => category.id));

  const parsed: { categoryId: string; amountMinor: number | null }[] = [];
  for (const entry of body.entries as Record<string, unknown>[]) {
    const categoryId = typeof entry.categoryId === "string" ? entry.categoryId : "";
    if (!ownIds.has(categoryId)) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const raw = entry.amount;
    if (raw === null || raw === undefined || raw === "") {
      parsed.push({ categoryId, amountMinor: null });
      continue;
    }

    try {
      parsed.push({ categoryId, amountMinor: parseAmount(String(raw), user.currency) });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid amount" },
        { status: 400 }
      );
    }
  }

  const day = firstDayOf(month);
  await db.transaction(async (tx) => {
    for (const entry of parsed) {
      if (entry.amountMinor === null) {
        await tx
          .delete(budgets)
          .where(
            and(
              eq(budgets.userId, user.id),
              eq(budgets.categoryId, entry.categoryId),
              eq(budgets.month, day)
            )
          );
        continue;
      }

      await tx
        .insert(budgets)
        .values({
          userId: user.id,
          categoryId: entry.categoryId,
          month: day,
          amountMinor: entry.amountMinor,
        })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.categoryId, budgets.month],
          set: { amountMinor: entry.amountMinor, updatedAt: new Date() },
        });
    }
  });

  const rows = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, user.id), eq(budgets.month, day)),
  });

  return NextResponse.json({ budgets: rows });
}
