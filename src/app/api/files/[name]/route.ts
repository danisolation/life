import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const storedName = basename(name);

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  if (!membership) {
    return NextResponse.json({ error: "No household found" }, { status: 400 });
  }

  const document = await db.query.documents.findFirst({
    where: (doc, { and, eq }) =>
      and(
        eq(doc.householdId, membership.householdId),
        eq(doc.fileUrl, `/api/files/${storedName}`)
      ),
  });

  if (!document) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(join(UPLOAD_DIR, storedName));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.fileType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
