"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, FlaskConical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type GettingStartedStep = {
  id: string;
  label: string;
  hint: string;
  href?: string;
  done: boolean;
};

export function GettingStarted({
  steps,
  isEmpty,
  hasSample,
}: {
  steps: GettingStartedStep[];
  isEmpty: boolean;
  hasSample: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = steps.filter((step) => !step.done);
  if (!remaining.length && !hasSample) return null;

  async function call(method: "POST" | "DELETE") {
    setIsBusy(true);
    setError(null);

    const response = await fetch("/api/sample-data", { method });
    setIsBusy(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {remaining.length ? `${remaining.length} things to set up` : "Sample data"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {remaining.length > 0 && (
          <ul className="space-y-3">
            {steps.map((step) => (
              <li key={step.id} className="flex items-start gap-3">
                {step.done ? (
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {step.href && !step.done ? (
                      <Link href={step.href} className="underline-offset-4 hover:underline">
                        {step.label}
                      </Link>
                    ) : (
                      step.label
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isEmpty && !hasSample && (
            <Button variant="outline" onClick={() => call("POST")} disabled={isBusy}>
              <FlaskConical /> {isBusy ? "Adding…" : "Fill with sample data"}
            </Button>
          )}
          {hasSample && (
            <Button variant="outline" onClick={() => call("DELETE")} disabled={isBusy}>
              <Trash2 /> {isBusy ? "Removing…" : "Remove sample data"}
            </Button>
          )}
          {(isEmpty || hasSample) && (
            <p className="text-xs text-muted-foreground">
              {hasSample
                ? "Three months of made-up entries, clearly marked so they can be removed in one click."
                : "Three months of made-up entries so you can see how the app looks with data. Removable in one click."}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
