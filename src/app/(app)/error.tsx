"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-12 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {error.message || "The page could not be loaded."}
          </p>
        </div>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
