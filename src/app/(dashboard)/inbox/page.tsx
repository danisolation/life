import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InboxUpload } from "@/components/inbox/inbox-upload";
import { InboxItems } from "@/components/inbox/inbox-items";
import { PageHeader } from "@/components/layout/page-header";

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Upload receipts, bills, warranties, and documents. AI will extract and organize the information."
      />

      <InboxUpload />
      <InboxItems userId={session.user.id} />
    </div>
  );
}
