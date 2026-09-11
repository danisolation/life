import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, entities, reminders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import type { EntityType, RelationType } from "@/types";

interface ConfirmedField {
  value: unknown;
  confidence: number;
  source: string;
}

interface ConfirmRequest {
  documentId: string;
  entityType: EntityType;
  name: string;
  description?: string;
  fields: Record<string, ConfirmedField>;
  suggestedRelations?: Array<{
    targetType: string;
    relationType: RelationType;
    confidence: number;
  }>;
}

const VALID_ENTITY_TYPES: EntityType[] = [
  "asset",
  "subscription",
  "warranty",
  "purchase",
  "receipt",
  "bill",
  "contract",
  "deadline",
  "task",
  "provider",
  "person",
  "document",
];

function coerceDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function buildRemindersForEntity(
  entityType: EntityType,
  attributes: Record<string, unknown>,
  entityId: string,
  householdId: string,
  entityName: string
): Array<{
  entityId: string;
  householdId: string;
  type: "deadline" | "preparation" | "follow_up" | "custom";
  title: string;
  message: string | null;
  triggerAt: Date;
  status: "scheduled";
}> {
  const out: ReturnType<typeof buildRemindersForEntity> = [];
  const now = new Date();

  const push = (
    type: (typeof out)[number]["type"],
    title: string,
    message: string,
    triggerAt: Date
  ) => {
    if (triggerAt.getTime() > now.getTime()) {
      out.push({
        entityId,
        householdId,
        type,
        title,
        message,
        triggerAt,
        status: "scheduled",
      });
    }
  };

  const expiryRaw =
    attributes.expiryDate ?? attributes.expiry_date ??
    attributes.endDate ?? attributes.end_date ??
    attributes.warrantyExpiry ?? attributes.warranty_expiry ??
    attributes.dueDate ?? attributes.due_date ??
    attributes.renewalDate ?? attributes.renewal_date;
  const expiry = coerceDate(expiryRaw);

  if (expiry) {
    const dateLabel = expiry.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    push(
      "deadline",
      `${entityName} expires ${dateLabel}`,
      `If nothing happens, coverage or validity may end on ${dateLabel}.`,
      expiry
    );

    const prep30 = new Date(expiry.getTime() - 30 * 24 * 60 * 60 * 1000);
    push(
      "preparation",
      `Review ${entityName} (30 days before expiry)`,
      `Inspect, test, and gather documents for ${entityName} ahead of its ${dateLabel} expiry.`,
      prep30
    );

    const prep7 = new Date(expiry.getTime() - 7 * 24 * 60 * 60 * 1000);
    push(
      "preparation",
      `Final check: ${entityName} expires in 7 days`,
      `Decide whether to act (claim, renew, cancel) before ${dateLabel}.`,
      prep7
    );
  }

  const returnRaw = attributes.returnDeadline ?? attributes.return_deadline ?? attributes.returnWindowEnd;
  const returnDeadline = coerceDate(returnRaw);
  if (returnDeadline) {
    push(
      "deadline",
      `${entityName} return window closes`,
      `Test the product and decide whether to keep it before the return window closes.`,
      returnDeadline
    );
  }

  return out;
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

  let body: ConfirmRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { documentId, entityType, name, description, fields, suggestedRelations } = body;

  if (!documentId || !entityType || !name) {
    return NextResponse.json(
      { error: "documentId, entityType, and name are required" },
      { status: 400 }
    );
  }

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
  }

  const document = await db.query.documents.findFirst({
    where: (doc, { and, eq }) =>
      and(
        eq(doc.id, documentId),
        eq(doc.householdId, membership.householdId)
      ),
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.entityId) {
    return NextResponse.json(
      { error: "Document has already been confirmed into the graph" },
      { status: 409 }
    );
  }

  const attributes: Record<string, unknown> = {};
  const fieldConfidence: Record<string, number> = {};
  for (const [key, field] of Object.entries(fields || {})) {
    attributes[key] = field.value;
    fieldConfidence[key] = field.confidence;
  }

  const [entity] = await db
    .insert(entities)
    .values({
      type: entityType,
      name,
      description: description || null,
      attributes,
      householdId: membership.householdId,
      createdBy: session.user.id,
    })
    .returning();

  await db
    .update(documents)
    .set({ entityId: entity.id, status: "completed" })
    .where(eq(documents.id, documentId));

  const createdRelations: string[] = [];
  for (const rel of suggestedRelations || []) {
    if (rel.confidence < 0.7) continue;
    if (rel.targetType !== entityType) continue;
    createdRelations.push(rel.relationType);
  }

  const reminderRows = buildRemindersForEntity(
    entityType,
    attributes,
    entity.id,
    membership.householdId,
    name
  );

  let remindersCreated = 0;
  if (reminderRows.length > 0) {
    await db.insert(reminders).values(reminderRows);
    remindersCreated = reminderRows.length;
  }

  const avgConfidence =
    Object.keys(fieldConfidence).length > 0
      ? Object.values(fieldConfidence).reduce((a, b) => a + b, 0) /
        Object.keys(fieldConfidence).length
      : 1;

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "document_confirmed",
    targetEntity: entity.id,
    targetType: entityType,
    reason: `Confirmed extraction from ${document.fileName} into ${entityType} "${name}"`,
    source: document.fileName,
    confidence: avgConfidence,
    metadata: { documentId, remindersCreated },
    householdId: membership.householdId,
  });

  return NextResponse.json(
    {
      message: "Document confirmed into Life Admin Graph",
      entity,
      remindersCreated,
    },
    { status: 201 }
  );
}
