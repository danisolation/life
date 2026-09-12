import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <SearchX aria-hidden className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Not found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              That record does not exist, or it belongs to another household.
            </p>
          </div>
          <Button render={<Link href="/" />}>Back to Home</Button>
        </div>
      </CardContent>
    </Card>
  );
}
