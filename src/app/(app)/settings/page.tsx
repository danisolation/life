import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/money/settings-form";

export default async function SettingsPage() {
  const user = await requireUser();

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .limit(1);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account and how amounts are shown." />
      <SettingsForm
        user={{
          name: user.name,
          email: user.email,
          currency: user.currency,
          locale: user.locale,
        }}
        hasTransactions={Boolean(existing)}
      />
    </div>
  );
}
