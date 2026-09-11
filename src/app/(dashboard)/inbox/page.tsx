import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InboxUpload } from "@/components/inbox/inbox-upload";
import { InboxItems } from "@/components/inbox/inbox-items";

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Life Admin Inbox</h1>
        <p className="text-muted-foreground">
          Upload receipts, bills, warranties, and documents. AI will extract and organize the information.
        </p>
      </div>

      <InboxUpload />
      <InboxItems userId={session.user.id} />
    </div>
  );
}
