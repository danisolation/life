import { requireUser } from "@/lib/session";
import { materializeRecurring } from "@/lib/recurring";
import { todayKey } from "@/lib/money/period";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await materializeRecurring(user.id, todayKey());

  return <AppShell>{children}</AppShell>;
}
