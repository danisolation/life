import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { CURRENCY_RE, LOCALE_RE, readJson } from "@/lib/validate";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Name must be 1-100 characters" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.locale !== undefined) {
    if (typeof body.locale !== "string" || !LOCALE_RE.test(body.locale)) {
      return NextResponse.json({ error: "Locale must look like vi-VN" }, { status: 400 });
    }
    updates.locale = body.locale;
  }

  if (body.currency !== undefined) {
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
    if (!CURRENCY_RE.test(currency)) {
      return NextResponse.json({ error: "Currency must be a 3-letter code" }, { status: 400 });
    }

    if (currency !== user.currency) {
      const [existing] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.userId, user.id))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "Currency cannot change once you have transactions. Delete your transactions first." },
          { status: 409 }
        );
      }

      updates.currency = currency;
    }
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      currency: updated.currency,
      locale: updated.locale,
    },
  });
}
