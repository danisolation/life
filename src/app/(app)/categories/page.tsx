import { requireUser } from "@/lib/session";
import { isMonth } from "@/lib/validate";
import { monthKey, todayKey } from "@/lib/money/period";
import { loadMonthView } from "@/lib/money-data";
import { PageHeader } from "@/components/layout/page-header";
import { MonthNav } from "@/components/money/month-nav";
import { CategoryManager } from "@/components/money/category-manager";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month } = await searchParams;
  const today = todayKey();
  const selected = month && isMonth(month) ? month : monthKey(new Date());
  const view = await loadMonthView(user.id, selected, today, {
    currency: user.currency,
    locale: user.locale,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group spending and set a monthly budget per category."
      />

      <MonthNav month={selected} basePath="/categories" locale={user.locale} />

      <CategoryManager
        categories={view.categories}
        budgets={view.budgets}
        spent={view.spentByCategory}
        suggestions={Object.fromEntries(
          view.budgetSuggestions.map((item) => [item.categoryId, item.amountMinor])
        )}
        month={selected}
        currency={user.currency}
        locale={user.locale}
      />
    </div>
  );
}
