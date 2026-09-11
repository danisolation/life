import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityRelations } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import type { RelationType } from "@/types";

const VALID_RELATIONS: RelationType[] = [
  "HAS_WARRANTY",
  "HAS_RECEIPT",
  "PAID_BY",
  "PROVIDED_BY",
  "BELONGS_TO",
  "REMINDER_FOR",
  "DEPENDS_ON",
  "EXTENDS",
  "CANCELS",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });

  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  let body: { fromEntityId?: string; toEntityId?: string; relationType?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fromEntityId, toEntityId, relationType, metadata } = body;

  if (!fromEntityId || !toEntityId || !relationType) {
    return NextResponse.json(
      { error: "fromEntityId, toEntityId, and relationType are required" },
      { status: 400 }
    );
  }

  if (fromEntityId === toEntityId) {
    return NextResponse.json({ error: "Cannot relate an entity to itself" }, { status: 400 });
  }

  if (!VALID_RELATIONS.includes(relationType as RelationType)) {
    return NextResponse.json({ error: `Invalid relationType: ${relationType}` }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    db.query.entities.findFirst({
      where: (ent, { and, eq }) =>
        and(eq(ent.id, fromEntityId), eq(ent.householdId, membership.householdId)),
    }),
    db.query.entities.findFirst({
      where: (ent, { and, eq }) =>
        and(eq(ent.id, toEntityId), eq(ent.householdId, membership.householdId)),
    }),
  ]);

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both entities must exist in your household" },
      { status: 404 }
    );
  }

  const existing = await db.query.entityRelations.findFirst({
    where: (rel, { and, eq }) =>
      and(
        eq(rel.fromEntityId, fromEntityId),
        eq(rel.toEntityId, toEntityId),
        eq(rel.relationType, relationType as RelationType)
      ),
  });

  if (existing) {
    return NextResponse.json(
      { error: "This relation already exists" },
      { status: 409 }
    );
  }

  const [relation] = await db
    .insert(entityRelations)
    .values({
      fromEntityId,
      toEntityId,
      relationType: relationType as RelationType,
      metadata: metadata || {},
    })
    .returning();

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "relation_created",
    targetEntity: fromEntityId,
    targetType: from.type,
    reason: `Linked ${from.type} "${from.name}" -[${relationType}]-> ${to.type} "${to.name}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ relation }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user!.id),
  });

  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const relation = await db.query.entityRelations.findFirst({
    where: eq(entityRelations.id, id),
    with: { fromEntity: true, toEntity: true },
  });

  if (!relation) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }

  const belongsToHousehold =
    relation.fromEntity.householdId === membership.householdId &&
    relation.toEntity.householdId === membership.householdId;

  if (!belongsToHousehold) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }

  await db.delete(entityRelations).where(eq(entityRelations.id, id));

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "relation_deleted",
    targetEntity: relation.fromEntityId,
    targetType: relation.fromEntity.type,
    reason: `Unlinked relation ${relation.relationType} between "${relation.fromEntity.name}" and "${relation.toEntity.name}"`,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ message: "Relation removed" });
}
