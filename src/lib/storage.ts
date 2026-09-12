import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10);

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export interface StoredFile {
  fileName: string;
  storedName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  buffer: Buffer;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported. Upload PDF, images, Word docs, or text.`,
    };
  }

  return { valid: true };
}

export async function storeFile(file: File): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const safeName = basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${randomUUID()}-${safeName}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, storedName), buffer);

  return {
    fileName: file.name,
    storedName,
    fileUrl: `/api/files/${storedName}`,
    fileType: file.type,
    fileSize: file.size,
    buffer,
  };
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await unlink(join(UPLOAD_DIR, basename(storedName)));
  } catch {
    // File may already be gone — not fatal
  }
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  return readFile(join(UPLOAD_DIR, basename(storedName)));
}

export function storedNameFromUrl(fileUrl: string): string | null {
  const prefix = "/api/files/";
  if (!fileUrl.startsWith(prefix)) return null;
  const name = fileUrl.slice(prefix.length);
  return name ? basename(name) : null;
}

function bufferToText(buffer: Buffer, mimeType: string): string {
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8").slice(0, 20000);
  }
  if (mimeType === "application/pdf") {
    return "[PDF binary — connect an AI provider with vision/PDF support for full extraction]";
  }
  if (mimeType.startsWith("image/")) {
    return "[Image binary — connect an AI provider with vision support for full extraction]";
  }
  return "[Binary content — connect an AI provider for full extraction]";
}

export function extractTextContent(buffer: Buffer, mimeType: string): string {
  return bufferToText(buffer, mimeType);
}
