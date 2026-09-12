import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/audit";
import { validateFile, storeFile, deleteStoredFile } from "@/lib/storage";

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart form body" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const entityId = formData.get("entityId");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (typeof entityId !== "string" || !entityId) {
    return NextResponse.json(
      { error: "entityId is required" },
      { status: 400 }
    );
  }

  // The target must belong to this household — never trust the id alone.
  const entity = await db.query.entities.findFirst({
    where: (ent, { and, eq }) =>
      and(eq(ent.id, entityId), eq(ent.householdId, membership.householdId)),
  });

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const stored = await storeFile(file);

  let document;
  try {
    const [inserted] = await db
      .insert(documents)
      .values({
        entityId: entity.id,
        householdId: membership.householdId,
        uploadedBy: session.user.id,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        fileType: stored.fileType,
        fileSize: stored.fileSize,
        extractedData: {},
        confidence: {},
        // Attaching is a deliberate filing decision, not a capture awaiting
        // extraction, so it does not sit in the inbox queue as "pending".
        status: "attached",
      })
      .returning();
    document = inserted;
  } catch (dbError) {
    await deleteStoredFile(stored.storedName);
    throw dbError;
  }

  await createAuditLog({
    actor: `User:${session.user.id}`,
    action: "document_attached",
    targetEntity: entity.id,
    targetType: entity.type,
    reason: `Attached ${stored.fileName} to "${entity.name}"`,
    source: stored.fileName,
    confidence: 1,
    householdId: membership.householdId,
  });

  return NextResponse.json({ document }, { status: 201 });
}
