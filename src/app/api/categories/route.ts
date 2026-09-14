import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { COLOR_RE, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = body.kind;
  const color = typeof body.color === "string" && COLOR_RE.test(body.color) ? body.color : "#64748b";

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Name must be 1-50 characters" }, { status: 400 });
  }
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.userId, user.id), eq(categories.kind, kind), eq(categories.name, name)),
  });
  if (existing) {
    return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
  }

  const [category] = await db
    .insert(categories)
    .values({ userId: user.id, name, kind, color })
    .returning();

  return NextResponse.json({ category }, { status: 201 });
}
