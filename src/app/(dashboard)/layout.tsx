import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/layout/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
