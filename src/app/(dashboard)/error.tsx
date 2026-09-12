"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              This page could not be loaded. Try again, and if it keeps failing
              check the server logs.
            </p>
          </div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </CardContent>
    </Card>
  );
}
