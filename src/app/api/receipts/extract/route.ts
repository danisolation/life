import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/money/period";
import { geminiConfigured, geminiErrorMessage, readReceiptImage } from "@/lib/ai/gemini";
import { parseReceiptResponse } from "@/lib/ai/receipt";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!geminiConfigured()) {
    return NextResponse.json(
      { error: "Receipt reading is not configured on this server" },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the photo as form data" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a photo of the receipt" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That file is not an image" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That image is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep the photo under 6 MB" }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const answer = await readReceiptImage({ base64, mimeType: file.type });
    const draft = parseReceiptResponse(answer, user.currency, todayKey());
    if (!draft) {
      return NextResponse.json(
        { error: "Could not find a total on that receipt. Try a clearer photo." },
        { status: 422 }
      );
    }
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("receipt extraction failed", error);
    const { message, status } = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
