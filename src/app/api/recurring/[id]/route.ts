import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, recurringRules } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { isValidDate, readJson } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

async function resolve(id: string, userId: string) {
  return db.query.recurringRules.findFirst({
    where: and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rule = await resolve(id, user.id);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (body.kind !== undefined) {
    return NextResponse.json({ error: "Rule type cannot be changed" }, { status: 400 });
  }

  const updates: Partial<typeof recurringRules.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Name must be 1-100 characters" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.amount !== undefined) {
    try {
      updates.amountMinor = parseAmount(String(body.amount), user.currency);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid amount" },
        { status: 400 }
      );
    }
  }

  if (body.startsOn !== undefined) {
    if (typeof body.startsOn !== "string" || !isValidDate(body.startsOn)) {
      return NextResponse.json({ error: "Pick a valid start date" }, { status: 400 });
    }
    updates.startsOn = body.startsOn;
  }

  if (body.frequency !== undefined) {
    if (body.frequency !== "monthly" && body.frequency !== "weekly") {
      return NextResponse.json({ error: "Frequency must be monthly or weekly" }, { status: 400 });
    }
    updates.frequency = body.frequency;
  }

  const frequency = updates.frequency ?? rule.frequency;

  if (body.dayOfMonth !== undefined || frequency === "monthly") {
    const dayOfMonth = Number(body.dayOfMonth ?? rule.dayOfMonth ?? 1);
    if (frequency === "monthly") {
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        return NextResponse.json({ error: "Day of month must be 1-31" }, { status: 400 });
      }
      updates.dayOfMonth = dayOfMonth;
      updates.weekday = null;
    }
  }

  if (body.weekday !== undefined || frequency === "weekly") {
    const weekday = Number(body.weekday ?? rule.weekday ?? 1);
    if (frequency === "weekly") {
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        return NextResponse.json({ error: "Weekday must be 0-6" }, { status: 400 });
      }
      updates.weekday = weekday;
      updates.dayOfMonth = null;
    }
  }

  if (body.categoryId !== undefined) {
    const categoryId =
      typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
    if (categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(eq(categories.id, categoryId), eq(categories.userId, user.id)),
      });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
      if (category.kind !== rule.kind) {
        return NextResponse.json(
          { error: "Category does not match the rule type" },
          { status: 400 }
        );
      }
    }
    updates.categoryId = categoryId;
  }

  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") {
      return NextResponse.json({ error: "Archived must be true or false" }, { status: 400 });
    }
    updates.archivedAt = body.archived ? new Date() : null;
  }

  const [updated] = await db
    .update(recurringRules)
    .set(updates)
    .where(eq(recurringRules.id, id))
    .returning();

  return NextResponse.json({ rule: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rule = await resolve(id, user.id);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  await db.delete(recurringRules).where(eq(recurringRules.id, id));
  return NextResponse.json({ ok: true });
}
