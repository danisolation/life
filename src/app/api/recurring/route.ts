import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, recurringRules } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { isValidDate, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = body.kind;
  const frequency = body.frequency;
  const startsOn = typeof body.startsOn === "string" ? body.startsOn : "";

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name must be 1-100 characters" }, { status: 400 });
  }
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }
  if (frequency !== "monthly" && frequency !== "weekly") {
    return NextResponse.json({ error: "Frequency must be monthly or weekly" }, { status: 400 });
  }
  if (!isValidDate(startsOn)) {
    return NextResponse.json({ error: "Pick a valid start date" }, { status: 400 });
  }

  let amountMinor: number;
  try {
    amountMinor = parseAmount(
      typeof body.amount === "string" ? body.amount : String(body.amount ?? ""),
      user.currency
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid amount" },
      { status: 400 }
    );
  }

  let dayOfMonth: number | null = null;
  let weekday: number | null = null;

  if (frequency === "monthly") {
    dayOfMonth = typeof body.dayOfMonth === "number" ? body.dayOfMonth : Number(body.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return NextResponse.json({ error: "Day of month must be 1-31" }, { status: 400 });
    }
  } else {
    weekday = typeof body.weekday === "number" ? body.weekday : Number(body.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return NextResponse.json({ error: "Weekday must be 0-6" }, { status: 400 });
    }
  }

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, user.id)),
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.kind !== kind) {
      return NextResponse.json({ error: "Category does not match the rule type" }, { status: 400 });
    }
  }

  const [rule] = await db
    .insert(recurringRules)
    .values({
      userId: user.id,
      name,
      kind,
      categoryId,
      amountMinor,
      currency: user.currency,
      frequency,
      dayOfMonth,
      weekday,
      startsOn,
    })
    .returning();

  return NextResponse.json({ rule }, { status: 201 });
}
