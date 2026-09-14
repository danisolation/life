"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TransactionForm,
  type CategoryOption,
  type TransactionDraft,
} from "./transaction-form";

export function ReceiptScanner({
  categories,
  currency,
  today,
  recentByNote,
}: {
  categories: CategoryOption[];
  currency: string;
  today: string;
  recentByNote: Record<string, string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsReading(true);
    setError(null);

    const body = new FormData();
    body.append("image", file);

    const response = await fetch("/api/receipts/extract", { method: "POST", body });
    setIsReading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not read that receipt");
      return;
    }

    const data = (await response.json()) as { draft: TransactionDraft };
    setDraft(data.draft);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={isReading}
        >
          <Camera /> {isReading ? "Reading…" : "Scan receipt"}
        </Button>
        {error && <p className="max-w-64 text-right text-xs text-destructive">{error}</p>}
      </div>

      {draft && (
        <TransactionForm
          categories={categories}
          currency={currency}
          today={today}
          recentByNote={recentByNote}
          draft={draft}
          open
          onOpenChange={(open) => {
            if (!open) setDraft(null);
          }}
        />
      )}
    </>
  );
}
