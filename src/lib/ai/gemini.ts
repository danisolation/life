import { RECEIPT_PROMPT, RECEIPT_SCHEMA } from "./receipt";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

export class GeminiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiErrorMessage(error: unknown): { message: string; status: number } {
  if (error instanceof GeminiError && error.status === 429) {
    return {
      message:
        "The AI quota for this key is used up. The free tier allows a small number of requests per day — try again tomorrow or enable billing on the key.",
      status: 429,
    };
  }
  return { message: "The AI reader is not available right now. Try again.", status: 502 };
}

export async function generateJson(input: {
  parts: GeminiPart[];
  schema: object;
  maxOutputTokens?: number;
  thinkingBudget?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: input.parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: input.schema,
        ...(input.maxOutputTokens ? { maxOutputTokens: input.maxOutputTokens } : {}),
        ...(input.thinkingBudget !== undefined
          ? { thinkingConfig: { thinkingBudget: input.thinkingBudget } }
          : {}),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(`Gemini responded ${response.status}: ${detail.slice(0, 300)}`, response.status);
  }

  const payload = (await response.json()) as GeminiResponse;
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

export function readReceiptImage(input: { base64: string; mimeType: string }): Promise<string> {
  return generateJson({
    parts: [
      { text: RECEIPT_PROMPT },
      { inlineData: { mimeType: input.mimeType, data: input.base64 } },
    ],
    schema: RECEIPT_SCHEMA,
  });
}
