"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MonthSummaryCard({ month }: { month: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);

  async function write() {
    setIsWriting(true);
    setError(null);

    const response = await fetch("/api/ai/month-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
    setIsWriting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not write this month up");
      return;
    }

    const data = (await response.json()) as { summary: string };
    setText(data.summary);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Written review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {text ? (
          <p className="text-sm leading-relaxed">{text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Gemini can turn this page into a few sentences, in the language of your locale. It
            only rephrases the numbers already computed above — it never recalculates them.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={write} disabled={isWriting}>
            {isWriting ? "Writing…" : text ? "Write it again" : "Write this month up"}
          </Button>
          {text && (
            <span className="text-xs text-muted-foreground">
              Written by Gemini from the numbers on this page.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
