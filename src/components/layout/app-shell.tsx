"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppNav } from "./app-nav";
import { ThemeToggle } from "./theme-toggle";

function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r bg-sidebar p-4 lg:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-3">
            <Wallet aria-hidden className="h-5 w-5 text-primary" />
            <span className="font-semibold">Money</span>
          </div>
          <AppNav />
        </div>
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b p-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="space-y-6">
                <AppNav onNavigate={() => setOpen(false)} />
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Money</span>
        </header>

        <main className="container mx-auto flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
