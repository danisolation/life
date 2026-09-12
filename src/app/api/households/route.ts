import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { households } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import { DEFAULT_HOUSEHOLD_SETTINGS, type HouseholdSettings } from "@/types";

const SETTING_KEYS = Object.keys(
  DEFAULT_HOUSEHOLD_SETTINGS
) as (keyof HouseholdSettings)[];

const CURRENCY_RE = /^[A-Z]{3}$/;
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2,4})?$/;

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The household comes from the session, never from the request body — a
  // client-supplied id would let any user edit someone else's household.
  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });

  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  if (membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only household admins can change these settings" },
      { status: 403 }
    );
  }

  let body: {
    name?: unknown;
    currency?: unknown;
    locale?: unknown;
    settings?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "name must be a non-empty string" },
        { status: 400 }
      );
    }
    updates.name = body.name.trim().slice(0, 255);
  }

  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || !CURRENCY_RE.test(body.currency)) {
      return NextResponse.json(
        { error: "currency must be a 3-letter ISO code, e.g. USD or VND" },
        { status: 400 }
      );
    }
    updates.currency = body.currency;
  }

  if (body.locale !== undefined) {
    if (typeof body.locale !== "string" || !LOCALE_RE.test(body.locale)) {
      return NextResponse.json(
        { error: "locale must look like en, en-US or vi-VN" },
        { status: 400 }
      );
    }
    updates.locale = body.locale;
  }

  if (body.settings !== undefined) {
    if (
      typeof body.settings !== "object" ||
      body.settings === null ||
      Array.isArray(body.settings)
    ) {
      return NextResponse.json(
        { error: "settings must be an object" },
        { status: 400 }
      );
    }

    const current = await db.query.households.findFirst({
      where: eq(households.id, membership.householdId),
    });

    const merged: HouseholdSettings = {
      ...DEFAULT_HOUSEHOLD_SETTINGS,
      ...((current?.settings ?? {}) as HouseholdSettings),
    };

    const incoming = body.settings as Record<string, unknown>;
    for (const key of SETTING_KEYS) {
      const value = incoming[key];
      if (value === undefined) continue;
      if (typeof value !== "boolean") {
        return NextResponse.json(
          { error: `settings.${key} must be a boolean` },
          { status: 400 }
        );
      }
      merged[key] = value;
    }

    updates.settings = merged;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(households)
    .set(updates)
    .where(eq(households.id, membership.householdId))
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "household_updated",
    targetEntity: membership.householdId,
    targetType: "household",
    reason: `Updated household settings (${Object.keys(updates)
      .filter((k) => k !== "updatedAt")
      .join(", ")})`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ household: updated });
}
