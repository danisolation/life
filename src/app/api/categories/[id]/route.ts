import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { COLOR_RE, readJson } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

async function resolve(id: string, userId: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const category = await resolve(id, user.id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (body.kind !== undefined) {
    return NextResponse.json({ error: "Category kind cannot be changed" }, { status: 400 });
  }

  const updates: Partial<typeof categories.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 50) {
      return NextResponse.json({ error: "Name must be 1-50 characters" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !COLOR_RE.test(body.color)) {
      return NextResponse.json({ error: "Color must be a hex value like #64748b" }, { status: 400 });
    }
    updates.color = body.color;
  }

  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number") {
      return NextResponse.json({ error: "Sort order must be a number" }, { status: 400 });
    }
    updates.sortOrder = body.sortOrder;
  }

  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") {
      return NextResponse.json({ error: "Archived must be true or false" }, { status: 400 });
    }
    updates.archivedAt = body.archived ? new Date() : null;
  }

  const [updated] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, id))
    .returning();

  return NextResponse.json({ category: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const category = await resolve(id, user.id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.categoryId, id)))
    .limit(1);

  if (used) {
    return NextResponse.json(
      { error: "This category has transactions. Archive it instead." },
      { status: 409 }
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
