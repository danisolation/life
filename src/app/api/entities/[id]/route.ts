import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityRelations } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

async function resolveEntity(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "No household found" }, { status: 400 }) };
  }

  const entity = await db.query.entities.findFirst({
    where: (ent, { and, eq }) =>
      and(eq(ent.id, id), eq(ent.householdId, membership.householdId)),
    with: {
      outgoingRelations: { with: { toEntity: true } },
      incomingRelations: { with: { fromEntity: true } },
      documents: true,
      tasks: true,
      reminders: true,
    },
  });

  if (!entity) {
    return { error: NextResponse.json({ error: "Entity not found" }, { status: 404 }) };
  }

  return { session, membership, entity };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await resolveEntity(id);
  if ("error" in result) return result.error;

  return NextResponse.json({ entity: result.entity });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await resolveEntity(id);
  if ("error" in result) return result.error;

  const { session, membership, entity } = result;

  let body: {
    name?: string;
    description?: string | null;
    attributes?: Record<string, unknown>;
    archived?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }
  if (body.attributes !== undefined) {
    if (typeof body.attributes !== "object" || body.attributes === null || Array.isArray(body.attributes)) {
      return NextResponse.json({ error: "attributes must be an object" }, { status: 400 });
    }
    const merged = { ...(entity.attributes as Record<string, unknown>) };
    for (const [key, value] of Object.entries(body.attributes)) {
      if (value === null || value === "") delete merged[key];
      else merged[key] = value;
    }
    updates.attributes = merged;
  }
  if (body.archived !== undefined) {
    updates.archivedAt = body.archived ? new Date() : null;
  }

  const [updated] = await db
    .update(entities)
    .set(updates)
    .where(eq(entities.id, id))
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: body.archived !== undefined ? (body.archived ? "entity_archived" : "entity_restored") : "entity_updated",
    targetEntity: id,
    targetType: entity.type,
    reason: `Updated ${entity.type} "${entity.name}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ entity: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await resolveEntity(id);
  if ("error" in result) return result.error;

  const { session, membership, entity } = result;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";

  if (permanent) {
    await db
      .delete(entityRelations)
      .where(or(eq(entityRelations.fromEntityId, id), eq(entityRelations.toEntityId, id)));
    await db.delete(entities).where(eq(entities.id, id));

    await createAuditLog({
      actor: `User:${session.user.id}`,
      action: "entity_deleted",
      targetEntity: id,
      targetType: entity.type,
      reason: `Permanently deleted ${entity.type} "${entity.name}"`,
      confidence: 1,
      householdId: membership.householdId,
    });

    return NextResponse.json({ message: "Entity permanently deleted" });
  }

  const [archived] = await db
    .update(entities)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "entity_archived",
    targetEntity: id,
    targetType: entity.type,
    reason: `Archived ${entity.type} "${entity.name}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ entity: archived, archived: true });
}
