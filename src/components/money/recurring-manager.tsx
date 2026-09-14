"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/format";
import { amountInputValue, formatMoney } from "@/lib/money/amount";
import type { CategoryOption } from "./transaction-form";

export type RecurringRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  categoryId: string | null;
  amountMinor: number;
  frequency: "monthly" | "weekly";
  dayOfMonth: number | null;
  weekday: number | null;
  startsOn: string;
  archivedAt: Date | null;
  nextDue: string;
  generatedCount: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleLabel(row: Pick<RecurringRow, "frequency" | "dayOfMonth" | "weekday">): string {
  return row.frequency === "monthly"
    ? `Monthly on day ${row.dayOfMonth ?? 1}`
    : `Weekly on ${WEEKDAYS[row.weekday ?? 1]}`;
}

function RuleForm({
  categories,
  currency,
  today,
  rule,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  categories: CategoryOption[];
  currency: string;
  today: string;
  rule?: RecurringRow;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(rule?.name ?? "");
  const [kind, setKind] = useState<"income" | "expense">(rule?.kind ?? "expense");
  const [amount, setAmount] = useState(
    rule ? amountInputValue(rule.amountMinor, currency) : ""
  );
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">(rule?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(
    String(rule?.dayOfMonth ?? Number(today.slice(8, 10)))
  );
  const [weekday, setWeekday] = useState(
    String(rule?.weekday ?? new Date(`${today}T00:00:00`).getDay())
  );
  const [startsOn, setStartsOn] = useState(rule?.startsOn ?? today);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const options = categories.filter(
    (category) => category.kind === kind && (!category.archivedAt || category.id === rule?.categoryId)
  );

  function chooseKind(next: "income" | "expense") {
    setKind(next);
    const current = categories.find((category) => category.id === categoryId);
    if (current && current.kind !== next) setCategoryId("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const response = await fetch(rule ? `/api/recurring/${rule.id}` : "/api/recurring", {
      method: rule ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        kind,
        amount,
        categoryId: categoryId || null,
        frequency,
        dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : null,
        weekday: frequency === "weekly" ? Number(weekday) : null,
        startsOn,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={<Button />}>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "New recurring rule"}</DialogTitle>
          <DialogDescription>
            Rules generate transactions when you open the app. Existing transactions are never
            changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              required
              maxLength={100}
              placeholder="Rent"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

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
            <Label htmlFor="rule-amount">Amount</Label>
            <Input
              id="rule-amount"
              inputMode="decimal"
              required
              placeholder="6000000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-category">Category</Label>
            <select
              id="rule-category"
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

          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "weekly"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={frequency === option ? "default" : "outline"}
                aria-pressed={frequency === option}
                onClick={() => setFrequency(option)}
              >
                {option === "monthly" ? "Monthly" : "Weekly"}
              </Button>
            ))}
          </div>

          {frequency === "monthly" ? (
            <div className="space-y-2">
              <Label htmlFor="rule-day">Day of month</Label>
              <select
                id="rule-day"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={dayOfMonth}
                onChange={(event) => setDayOfMonth(event.target.value)}
              >
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="rule-weekday">Day of week</Label>
              <select
                id="rule-weekday"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={weekday}
                onChange={(event) => setWeekday(event.target.value)}
              >
                {WEEKDAY_SHORT.map((label, index) => (
                  <option key={label} value={index}>
                    {WEEKDAYS[index]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rule-start">Starting from</Label>
            <Input
              id="rule-start"
              type="date"
              required
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSaving || !name.trim() || !amount.trim()}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RuleRow({
  rule,
  categories,
  currency,
  locale,
  today,
}: {
  rule: RecurringRow;
  categories: CategoryOption[];
  currency: string;
  locale: string;
  today: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((item) => item.id === rule.categoryId);

  async function archive(next: boolean) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/recurring/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: next }),
    });
    setPending(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  async function remove() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/recurring/${rule.id}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category?.color ?? "#94a3b8" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {rule.name}
          {rule.archivedAt && <span className="ml-2 text-xs text-muted-foreground">paused</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {scheduleLabel(rule)} · {category?.name ?? "Uncategorized"} ·{" "}
          {rule.generatedCount === 0
            ? "nothing generated yet"
            : `${rule.generatedCount} generated`}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-medium tabular-nums ${
            rule.kind === "income" ? "text-success" : ""
          }`}
        >
          {rule.kind === "income" ? "+" : "−"}
          {formatMoney(rule.amountMinor, currency, locale)}
        </p>
        <p className="text-xs text-muted-foreground">
          {rule.archivedAt ? "paused" : `next ${formatDate(rule.nextDue, locale)}`}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${rule.name}`} />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={pending} onClick={() => archive(!rule.archivedAt)}>
            {rule.archivedAt ? <Play /> : <Pause />}
            {rule.archivedAt ? "Resume" : "Pause"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={pending} onClick={remove}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p className="w-full text-xs text-destructive">{error}</p>}

      {editOpen && (
        <RuleForm
          categories={categories}
          currency={currency}
          today={today}
          rule={rule}
          open
          onOpenChange={(open) => {
            if (!open) setEditOpen(false);
          }}
        />
      )}
    </li>
  );
}

export function RecurringManager({
  rules,
  categories,
  currency,
  locale,
  today,
}: {
  rules: RecurringRow[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
  today: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RuleForm
          categories={categories}
          currency={currency}
          today={today}
          trigger={
            <>
              <Plus /> New rule
            </>
          }
        />
      </div>

      <Card>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring rules yet"
              description="Rent, utilities or a subscription — set it once and it shows up on its own."
            />
          ) : (
            <ul className="divide-y">
              {rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  categories={categories}
                  currency={currency}
                  locale={locale}
                  today={today}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
