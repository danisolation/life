"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseQuickEntry } from "@/lib/money/quick-entry";
import type { CategoryOption } from "./transaction-form";

export function QuickCapture({
  currency,
  today,
  categories,
  recentByNote = {},
}: {
  currency: string;
  today: string;
  categories: CategoryOption[];
  recentByNote?: Record<string, string>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(null);

    const parsed = parseQuickEntry(text, currency);
    if (!parsed) {
      setError('No amount found. Try "65k lunch" or "+20tr salary".');
      return;
    }

    const suggested = parsed.note ? recentByNote[parsed.note.trim().toLowerCase()] : undefined;
    const category = categories.find(
      (item) => item.id === suggested && item.kind === parsed.kind && !item.archivedAt
    );

    setIsSaving(true);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: parsed.kind,
        categoryId: category?.id ?? null,
        amount: parsed.amount,
        occurredOn: today,
        note: parsed.note,
      }),
    });
    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      return;
    }

    setText("");
    setSaved(
      `${parsed.kind === "income" ? "+" : "−"}${parsed.amount}${parsed.note ? ` · ${parsed.note}` : ""}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'65k lunch  |  +20tr salary  |  1,5tr rent'}
          aria-label="Quick add a transaction for today"
          className="h-9"
          disabled={isSaving}
        />
        <Button type="submit" disabled={isSaving || !text.trim()}>
          <Plus /> Add
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && (
        <p className="text-xs text-muted-foreground" role="status">
          Saved {saved} to today
        </p>
      )}
    </form>
  );
}
