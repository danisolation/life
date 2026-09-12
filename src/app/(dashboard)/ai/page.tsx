import { redirect } from "next/navigation";
import { AIChat } from "@/components/ai/ai-chat";
import { PageHeader } from "@/components/layout/page-header";
import { requireAuth } from "@/lib/session";

export default async function AIPage() {
  const session = await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your life admin, get recommendations, and take action."
      />

      <AIChat />
    </div>
  );
}
