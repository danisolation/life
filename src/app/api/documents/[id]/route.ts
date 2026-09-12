import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import { captureAgent } from "@/lib/ai/capture-agent";
import {
  extractTextContent,
  readStoredFile,
  storedNameFromUrl,
} from "@/lib/storage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "retry") {
    return NextResponse.json(
      { error: 'Unsupported action. Expected "retry".' },
      { status: 400 }
    );
  }

  const document = await db.query.documents.findFirst({
    where: (doc, { and, eq }) =>
      and(eq(doc.id, id), eq(doc.householdId, membership.householdId)),
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const storedName = storedNameFromUrl(document.fileUrl);
  if (!storedName) {
    return NextResponse.json(
      { error: "This document has no stored file to retry" },
      { status: 409 }
    );
  }

  let content: string;
  try {
    const buffer = await readStoredFile(storedName);
    content = extractTextContent(buffer, document.fileType);
  } catch {
    return NextResponse.json(
      { error: "The stored file is missing from disk" },
      { status: 409 }
    );
  }

  await db
    .update(documents)
    .set({ status: "processing" })
    .where(eq(documents.id, document.id));

  const captureResult = await captureAgent.processDocument(
    {
      type: await captureAgent.detectDocumentType(content, document.fileType),
      content,
      mimeType: document.fileType,
    },
    document.id,
    document.fileName
  );

  const succeeded = captureResult.status === "completed";

  const [updated] = await db
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
      status: succeeded ? "completed" : "failed",
    })
    .where(eq(documents.id, document.id))
    .returning();

  await createAuditLog({
    actor: "CaptureAgent",
    action: succeeded ? "extraction_retried" : "extraction_retry_failed",
    targetEntity: document.id,
    targetType: "document",
    reason: `Retried extraction for ${document.fileName}`,
    source: document.fileName,
    confidence: succeeded ? 0.9 : 0.2,
    householdId: membership.householdId,
  });

  return NextResponse.json({
    document: updated,
    extraction: captureResult.extraction,
  });
}
