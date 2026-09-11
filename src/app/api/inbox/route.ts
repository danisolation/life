import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { captureAgent } from "@/lib/ai/capture-agent";
import { createAuditLog } from "@/lib/audit";
import {
  validateFile,
  storeFile,
  extractTextContent,
  deleteStoredFile,
} from "@/lib/storage";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return NextResponse.json({ documents: [] });
  }

  const docs = await db.query.documents.findMany({
    where: (doc, { eq }) => eq(doc.householdId, membership.householdId),
    orderBy: (doc, { desc }) => [desc(doc.createdAt)],
    limit: 20,
  });

  return NextResponse.json({ documents: docs });
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const stored = await storeFile(file);

    let documentId: string;
    try {
      const [document] = await db
        .insert(documents)
        .values({
          householdId: membership.householdId,
          uploadedBy: session.user.id,
          fileName: stored.fileName,
          fileUrl: stored.fileUrl,
          fileType: stored.fileType,
          fileSize: stored.fileSize,
          status: "processing",
        })
        .returning();
      documentId = document.id;
    } catch (dbError) {
      await deleteStoredFile(stored.storedName);
      throw dbError;
    }

    const content = extractTextContent(stored.buffer, stored.fileType);

    const captureResult = await captureAgent.processDocument(
      {
        type: await captureAgent.detectDocumentType(content, stored.fileType),
        content,
        mimeType: stored.fileType,
      },
      documentId,
      stored.fileName
    );

    await db
      .update(documents)
      .set({
        extractedData: captureResult.extraction?.fields || {},
        confidence: captureResult.extraction
          ? Object.fromEntries(
              Object.entries(captureResult.extraction.fields).map(([k, v]) => [
                k,
                v.confidence,
              ])
            )
          : {},
        status: captureResult.status === "completed" ? "completed" : "failed",
      })
      .where(eq(documents.id, documentId));

    await createAuditLog({
      actor: "CaptureAgent",
      action: "document_uploaded",
      targetEntity: documentId,
      targetType: "document",
      reason: `Uploaded ${stored.fileName}`,
      source: stored.fileName,
      confidence: 0.95,
      householdId: membership.householdId,
    });

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    return NextResponse.json({
      message: "Document processed",
      document,
      extraction: captureResult.extraction,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
