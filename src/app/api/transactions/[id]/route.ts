import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { isValidDate, readJson } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, user.id)),
  });
  if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const kind = body.kind === undefined ? existing.kind : body.kind;
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }

  const categoryId =
    body.categoryId === undefined
      ? existing.categoryId
      : typeof body.categoryId === "string" && body.categoryId
        ? body.categoryId
        : null;

  if (categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, user.id)),
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.kind !== kind) {
      return NextResponse.json({ error: "Category does not match the transaction type" }, { status: 400 });
    }
  }

  const occurredOn = body.occurredOn === undefined ? existing.occurredOn : String(body.occurredOn);
  if (!isValidDate(occurredOn)) {
    return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });
  }

  let amountMinor = existing.amountMinor;
  if (body.amount !== undefined) {
    try {
      amountMinor = parseAmount(String(body.amount), user.currency);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid amount" },
        { status: 400 }
      );
    }
  }

  const note =
    body.note === undefined
      ? existing.note
      : typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : null;

  const [transaction] = await db
    .update(transactions)
    .set({ kind, categoryId, occurredOn, amountMinor, note, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning();

  return NextResponse.json({ transaction });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, user.id)),
  });
  if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  await db.delete(transactions).where(eq(transactions.id, id));
  return NextResponse.json({ ok: true });
}
