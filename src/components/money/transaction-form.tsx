"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { amountInputValue } from "@/lib/money/amount";

export type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  archivedAt: Date | null;
};

export type TransactionRecord = {
  id: string;
  kind: "income" | "expense";
  categoryId: string | null;
  recurringId: string | null;
  amountMinor: number;
  currency: string;
  occurredOn: string;
  note: string | null;
};

export function TransactionForm({
  categories,
  currency,
  today,
  recentByNote = {},
  transaction,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  categories: CategoryOption[];
  currency: string;
  today: string;
  recentByNote?: Record<string, string>;
  transaction?: TransactionRecord;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [kind, setKind] = useState<"income" | "expense">(transaction?.kind ?? "expense");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [amount, setAmount] = useState(
    transaction ? amountInputValue(transaction.amountMinor, transaction.currency) : ""
  );
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? today);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const options = categories.filter(
    (category) =>
      category.kind === kind && (!category.archivedAt || category.id === transaction?.categoryId)
  );

  function chooseKind(next: "income" | "expense") {
    setKind(next);
    const current = categories.find((category) => category.id === categoryId);
    if (current && current.kind !== next) setCategoryId("");
  }

  function suggestFromNote() {
    if (categoryId) return;
    const match = recentByNote[note.trim().toLowerCase()];
    if (!match) return;
    const category = categories.find((item) => item.id === match);
    if (category && category.kind === kind && !category.archivedAt) setCategoryId(match);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const response = await fetch(
      transaction ? `/api/transactions/${transaction.id}` : "/api/transactions",
      {
        method: transaction ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, categoryId: categoryId || null, amount, occurredOn, note }),
      }
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setOpen(false);
    if (!transaction) {
      setAmount("");
      setNote("");
      setCategoryId("");
      setError(null);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={<Button />}>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            Amounts are in {currency}. Shortcuts like 50k or 1,5tr work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={kind === option ? "default" : "outline"}
                aria-pressed={kind === option}
                onClick={() => chooseKind(option)}
              >
                {option === "expense" ? "Expense" : "Income"}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              required
              placeholder="50000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Uncategorized</option>
              {options.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occurredOn">Date</Label>
            <Input
              id="occurredOn"
              type="date"
              required
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              maxLength={500}
              placeholder="Lunch, groceries, salary…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={suggestFromNote}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSaving || !amount.trim()}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
