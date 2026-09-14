"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDayLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money/amount";
import {
  TransactionForm,
  type CategoryOption,
  type TransactionRecord,
} from "./transaction-form";

export function TransactionList({
  transactions,
  categories,
  currency,
  locale,
  today,
  recentByNote,
}: {
  transactions: TransactionRecord[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
  today: string;
  recentByNote: Record<string, string>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TransactionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const byId = new Map(categories.map((category) => [category.id, category]));
  const groups = new Map<string, TransactionRecord[]>();
  for (const transaction of transactions) {
    groups.set(transaction.occurredOn, [
      ...(groups.get(transaction.occurredOn) ?? []),
      transaction,
    ]);
  }
  const days = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));
  const editing = transactions.find((transaction) => transaction.id === editingId);

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const response = await fetch(`/api/transactions/${deleting.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setDeleteError(data?.error ?? "Something went wrong");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const rows = groups.get(day) ?? [];
        const dayTotal = rows
          .filter((row) => row.kind === "expense")
          .reduce((sum, row) => sum + row.amountMinor, 0);

        return (
          <Card key={day}>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{formatDayLabel(day, locale)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Spent {formatMoney(dayTotal, currency, locale)}
                </p>
              </div>
              <ul className="divide-y">
                {rows.map((transaction) => {
                  const category = transaction.categoryId
                    ? byId.get(transaction.categoryId)
                    : undefined;
                  return (
                    <li key={transaction.id} className="flex items-center gap-3 py-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          <span className="truncate">{category?.name ?? "Uncategorized"}</span>
                          {transaction.recurringId && (
                            <Repeat
                              aria-label="Recurring"
                              className="size-3 shrink-0 text-muted-foreground"
                            />
                          )}
                        </p>
                        {transaction.note && (
                          <p className="truncate text-xs text-muted-foreground">
                            {transaction.note}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-sm font-medium tabular-nums ${
                          transaction.kind === "income" ? "text-success" : ""
                        }`}
                      >
                        {transaction.kind === "income" ? "+" : "−"}
                        {formatMoney(transaction.amountMinor, currency, locale)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${category?.name ?? "uncategorized transaction"}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(transaction.id)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(transaction);
                            }}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {editing && (
        <TransactionForm
          key={editing.id}
          categories={categories}
          currency={currency}
          today={today}
          recentByNote={recentByNote}
          transaction={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      )}

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this transaction?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `${formatMoney(deleting.amountMinor, currency, locale)} on ${deleting.occurredOn}.`
                : ""}{" "}
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
