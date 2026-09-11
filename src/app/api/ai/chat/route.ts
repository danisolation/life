import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAIProvider } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const provider = getAIProvider();

    const response = await provider.chat([
      {
        role: "system",
        content:
          "You are the Life Admin AI assistant. You help users manage their personal life administration including subscriptions, warranties, bills, deadlines, and household tasks. Be concise, helpful, and proactive in your recommendations.",
      },
      { role: "user", content: message },
    ]);

    return NextResponse.json({ response: response.content });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
