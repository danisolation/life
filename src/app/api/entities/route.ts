import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityRelations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return NextResponse.json({ entities: [] });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const conditions = [eq(entities.householdId, membership.householdId)];
  if (type) {
    conditions.push(eq(entities.type, type as typeof entities.type.enumValues[number]));
  }

  const entityList = await db.query.entities.findMany({
    where: and(...conditions),
    orderBy: [desc(entities.createdAt)],
    with: {
      outgoingRelations: {
        with: {
          toEntity: true,
        },
      },
      incomingRelations: {
        with: {
          fromEntity: true,
        },
      },
    },
  });

  return NextResponse.json({ entities: entityList });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { type, name, description, attributes, relations } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Type and name are required" },
        { status: 400 }
      );
    }

    const [entity] = await db
      .insert(entities)
      .values({
        type,
        name,
        description,
        attributes: attributes || {},
        householdId: membership.householdId,
        createdBy: session.user.id,
      })
      .returning();

    // Create relations if provided
    if (relations && Array.isArray(relations)) {
      for (const rel of relations) {
        await db.insert(entityRelations).values({
          fromEntityId: entity.id,
          toEntityId: rel.toEntityId,
          relationType: rel.relationType,
          metadata: rel.metadata || {},
        });
      }
    }

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("Create entity error:", error);
    return NextResponse.json(
      { error: "Failed to create entity" },
      { status: 500 }
    );
  }
}
