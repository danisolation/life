import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";

export default function AppNotFound() {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="That page does not exist."
          action={
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to overview
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
}
