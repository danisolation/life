import { Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/session";
import { isMonth } from "@/lib/validate";
import { monthKey, todayKey } from "@/lib/money/period";
import { loadMonthView, loadNoteMap } from "@/lib/money-data";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { MonthNav } from "@/components/money/month-nav";
import { TransactionFilters } from "@/components/money/transaction-filters";
import { TransactionForm } from "@/components/money/transaction-form";
import { TransactionList } from "@/components/money/transaction-list";
import { QuickCapture } from "@/components/money/quick-capture";
import { ReceiptScanner } from "@/components/money/receipt-scanner";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; kind?: string; categoryId?: string; q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayKey();
  const selected = params.month && isMonth(params.month) ? params.month : monthKey(new Date());
  const view = await loadMonthView(user.id, selected, today, {
    currency: user.currency,
    locale: user.locale,
  });

  const kind = params.kind === "income" || params.kind === "expense" ? params.kind : "";
  const categoryId = params.categoryId ?? "";
  const query = (params.q ?? "").trim();

  let rows = view.transactions.filter((row) => row.occurredOn.startsWith(selected));
  if (kind) rows = rows.filter((row) => row.kind === kind);
  if (categoryId) rows = rows.filter((row) => row.categoryId === categoryId);
  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter((row) => (row.note ?? "").toLowerCase().includes(needle));
  }
  rows = [...rows].sort((a, b) =>
    a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0
  );

  const recentByNote = await loadNoteMap(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Everything you recorded, newest first."
        action={
          <div className="flex items-start gap-2">
            <ReceiptScanner
              categories={view.categories}
              currency={user.currency}
              today={today}
              recentByNote={recentByNote}
            />
            <TransactionForm
              categories={view.categories}
              currency={user.currency}
              today={today}
              recentByNote={recentByNote}
              trigger={
                <>
                  <Plus /> Add
                </>
              }
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={selected} basePath="/transactions" locale={user.locale} />
        <TransactionFilters
          month={selected}
          categories={view.categories.filter((category) => !category.archivedAt)}
          kind={kind}
          categoryId={categoryId}
          query={query}
        />
      </div>

      {selected === monthKey(new Date()) && (
        <QuickCapture
          currency={user.currency}
          today={today}
          categories={view.categories}
          recentByNote={recentByNote}
        />
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title="No transactions match"
              description="Try another month, or clear the filters."
            />
          </CardContent>
        </Card>
      ) : (
        <TransactionList
          transactions={rows}
          categories={view.categories}
          currency={user.currency}
          locale={user.locale}
          today={today}
          recentByNote={recentByNote}
        />
      )}
    </div>
  );
}
