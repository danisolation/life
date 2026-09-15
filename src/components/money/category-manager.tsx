"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { amountInputValue, formatMoney } from "@/lib/money/amount";
import type { CategoryOption } from "./transaction-form";

type Spent = Record<string, { totalMinor: number; count: number }>;

async function patchCategory(id: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Something went wrong";
}

function BudgetCell({
  categoryId,
  month,
  currency,
  locale,
  initialMinor,
  suggestedMinor,
}: {
  categoryId: string;
  month: string;
  currency: string;
  locale: string;
  initialMinor: number;
  suggestedMinor: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialMinor ? amountInputValue(initialMinor, currency) : "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: string) {
    const current = initialMinor ? amountInputValue(initialMinor, currency) : "";
    if (next.trim() === current) return;
    setValue(next);

    setStatus("saving");
    setMessage(null);
    const response = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, entries: [{ categoryId, amount: next.trim() || null }] }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("error");
      setMessage(data?.error ?? "Could not save");
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  const canSuggest = suggestedMinor > 0 && suggestedMinor !== initialMinor;

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        aria-label="Monthly budget"
        inputMode="decimal"
        placeholder="No budget"
        className="h-8 w-28 text-right tabular-nums"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => save(value)}
      />
      {canSuggest && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => save(amountInputValue(suggestedMinor, currency))}
        >
          Use {formatMoney(suggestedMinor, currency, locale)}
        </button>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
      {status === "saving" && <p className="text-xs text-muted-foreground">Saving…</p>}
    </div>
  );
}

function CategoryRow({
  category,
  spent,
  budgetMinor,
  suggestedMinor,
  month,
  currency,
  locale,
}: {
  category: CategoryOption;
  spent: Spent[string] | undefined;
  budgetMinor: number;
  suggestedMinor: number;
  month: string;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<string | null>) {
    setPending(true);
    setError(null);
    const failure = await action();
    setPending(false);
    if (failure) {
      setError(failure);
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {category.name}
          {category.archivedAt && (
            <span className="ml-2 text-xs text-muted-foreground">archived</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {spent?.count ?? 0} this month · {formatMoney(spent?.totalMinor ?? 0, currency, locale)}
        </p>
      </div>

      {!category.archivedAt && (
        <BudgetCell
          categoryId={category.id}
          month={month}
          currency={currency}
          locale={locale}
          initialMinor={budgetMinor}
          suggestedMinor={suggestedMinor}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${category.name}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={() => run(() => patchCategory(category.id, { archived: !category.archivedAt }))}
          >
            {category.archivedAt ? "Restore" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
              setPending(false);
              if (!response.ok) {
                const data = (await response.json().catch(() => null)) as { error?: string } | null;
                setError(data?.error ?? "Something went wrong");
                return;
              }
              router.refresh();
            }}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p className="w-full text-xs text-destructive">{error}</p>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => patchCategory(category.id, { name, color }));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`name-${category.id}`}>Name</Label>
              <Input
                id={`name-${category.id}`}
                required
                maxLength={50}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`color-${category.id}`}>Color</Label>
              <Input
                id={`color-${category.id}`}
                type="color"
                className="h-8 w-16 p-1"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function NewCategoryDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, color }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setOpen(false);
    setName("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus /> New category
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>Group your transactions however you like.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={kind === option ? "default" : "outline"}
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
              >
                {option === "expense" ? "Expense" : "Income"}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-category-name">Name</Label>
            <Input
              id="new-category-name"
              required
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-category-color">Color</Label>
            <Input
              id="new-category-color"
              type="color"
              className="h-8 w-16 p-1"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryManager({
  categories,
  budgets,
  spent,
  suggestions,
  month,
  currency,
  locale,
}: {
  categories: CategoryOption[];
  budgets: { categoryId: string; amountMinor: number }[];
  spent: Spent;
  suggestions: Record<string, number>;
  month: string;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const budgetByCategory = new Map(budgets.map((row) => [row.categoryId, row.amountMinor]));

  const pending = Object.entries(suggestions).filter(
    ([categoryId, amountMinor]) => budgetByCategory.get(categoryId) !== amountMinor
  );

  async function applyAll() {
    setApplying(true);
    setApplyError(null);
    const response = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        entries: pending.map(([categoryId, amountMinor]) => ({
          categoryId,
          amount: amountInputValue(amountMinor, currency),
        })),
      }),
    });
    setApplying(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setApplyError(data?.error ?? "Could not apply the suggestions");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {applyError && <p className="text-sm text-destructive">{applyError}</p>}
        {pending.length > 0 && (
          <Button variant="outline" onClick={applyAll} disabled={applying}>
            {applying ? "Applying…" : `Apply ${pending.length} suggested budgets`}
          </Button>
        )}
        <NewCategoryDialog />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {(["expense", "income"] as const).map((kind) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kind === "expense" ? "Expense" : "Income"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {categories
                  .filter((category) => category.kind === kind)
                  .map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      spent={spent[category.id]}
                      budgetMinor={budgetByCategory.get(category.id) ?? 0}
                      suggestedMinor={suggestions[category.id] ?? 0}
                      month={month}
                      currency={currency}
                      locale={locale}
                    />
                  ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
