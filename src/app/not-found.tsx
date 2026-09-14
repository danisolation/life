import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/10 p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Compass aria-hidden className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Page not found</p>
          <p className="text-sm text-muted-foreground">That page does not exist.</p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to overview
        </Link>
      </div>
    </div>
  );
}
