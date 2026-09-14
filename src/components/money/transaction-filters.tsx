"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryRecord } from "@/lib/money-data";

export function TransactionFilters({
  month,
  categories,
  kind,
  categoryId,
  query,
}: {
  month: string;
  categories: CategoryRecord[];
  kind: string;
  categoryId: string;
  query: string;
}) {
  const router = useRouter();

  function apply(patch: { kind?: string; categoryId?: string; q?: string }) {
    const next = { kind, categoryId, q: query, ...patch };
    const params = new URLSearchParams({ month });
    if (next.kind) params.set("kind", next.kind);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    if (next.q) params.set("q", next.q);
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        {[
          { label: "All", value: "" },
          { label: "Income", value: "income" },
          { label: "Expense", value: "expense" },
        ].map((option) => (
          <Button
            key={option.label}
            variant={kind === option.value ? "default" : "outline"}
            size="sm"
            aria-pressed={kind === option.value}
            onClick={() => apply({ kind: option.value, categoryId: "" })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <select
        aria-label="Filter by category"
        className="h-7 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={categoryId}
        onChange={(event) => apply({ categoryId: event.target.value, kind: "" })}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          apply({ q: typeof value === "string" ? value : "" });
        }}
      >
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search notes"
          className="h-7 w-40"
          aria-label="Search notes"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
    </div>
  );
}
