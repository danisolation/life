import { redirect } from "next/navigation";
import { AIChat } from "@/components/ai/ai-chat";
import { requireAuth } from "@/lib/session";

export default async function AIPage() {
  const session = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about your life admin, get recommendations, and take
          action.
        </p>
      </div>

      <AIChat />
    </div>
  );
}
