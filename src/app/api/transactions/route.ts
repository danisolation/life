import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { isValidDate, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const kind = body.kind;
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }

  const occurredOn = typeof body.occurredOn === "string" ? body.occurredOn : "";
  if (!isValidDate(occurredOn)) {
    return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });
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

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, user.id)),
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.kind !== kind) {
      return NextResponse.json({ error: "Category does not match the transaction type" }, { status: 400 });
    }
  }

  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const [transaction] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      kind,
      categoryId,
      amountMinor,
      currency: user.currency,
      occurredOn,
      note,
    })
    .returning();

  return NextResponse.json({ transaction }, { status: 201 });
}
