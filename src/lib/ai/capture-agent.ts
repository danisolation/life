// Capture Agent - handles document ingestion and data extraction
import { getAIProvider, type ExtractionResult, type DocumentInput } from "./provider";
import { v4 as uuid } from "uuid";

export interface CaptureResult {
  id: string;
  documentId: string;
  status: "pending" | "processing" | "completed" | "failed";
  extraction: ExtractionResult | null;
  createdAt: Date;
}

export class CaptureAgent {
  private provider = getAIProvider();

  async processDocument(
    input: DocumentInput,
    documentId: string,
    fileName: string
  ): Promise<CaptureResult> {
    const id = uuid();

    try {
      const extraction = await this.provider.extract(input);

      return {
        id,
        documentId,
        status: "completed",
        extraction,
        createdAt: new Date(),
      };
    } catch (error) {
      return {
        id,
        documentId,
        status: "failed",
        extraction: null,
        createdAt: new Date(),
      };
    }
  }

  async detectDocumentType(content: string, mimeType: string): Promise<DocumentInput["type"]> {
    if (mimeType.includes("pdf")) {
      return "other"; // Could be any type of PDF
    }
    if (mimeType.includes("image")) {
      return "receipt"; // Default assumption for images
    }
    return "other";
  }
}

export const captureAgent = new CaptureAgent();
