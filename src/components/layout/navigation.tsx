"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Inbox,
  Network,
  CalendarClock,
  CheckSquare,
  Bot,
  Settings,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const homeItem = { name: "Home", href: "/", icon: Home };

const navigationGroups = [
  {
    label: "Capture",
    items: [{ name: "Inbox", href: "/inbox", icon: Inbox }],
  },
  {
    label: "Track",
    items: [
      { name: "Life", href: "/life", icon: Network },
      { name: "Deadlines", href: "/deadlines", icon: CalendarClock },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Assist",
    items: [
      { name: "AI", href: "/ai", icon: Bot },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const allDestinations = [homeItem, ...navigationGroups.flatMap((g) => g.items)];

const primaryMobileHrefs = ["/", "/inbox", "/life", "/tasks"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network aria-hidden className="h-5 w-5" />
          <span>Life Admin OS</span>
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto p-3">
        <Link
          href={homeItem.href}
          aria-current={isActive(pathname, homeItem.href) ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, homeItem.href)
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {isActive(pathname, homeItem.href) && (
            <span
              aria-hidden
              className="absolute left-0 h-4 w-0.5 rounded-full bg-primary"
            />
          )}
          <homeItem.icon aria-hidden className="h-4 w-4 shrink-0" />
          {homeItem.name}
        </Link>

        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 h-4 w-0.5 rounded-full bg-primary"
                    />
                  )}
                  <item.icon aria-hidden className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-end border-t p-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = allDestinations.filter((d) => primaryMobileHrefs.includes(d.href));
  const overflow = allDestinations.filter((d) => !primaryMobileHrefs.includes(d.href));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex items-stretch">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon aria-hidden className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More destinations"
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <Menu aria-hidden className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-4">
            {overflow.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                    active ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon aria-hidden className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
