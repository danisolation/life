import type { CategoryKind } from "./schema";

export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind; color: string }[] = [
  { name: "Food & Drinks", kind: "expense", color: "#f97316" },
  { name: "Groceries", kind: "expense", color: "#84cc16" },
  { name: "Transport", kind: "expense", color: "#06b6d4" },
  { name: "Rent", kind: "expense", color: "#8b5cf6" },
  { name: "Utilities", kind: "expense", color: "#eab308" },
  { name: "Phone & Internet", kind: "expense", color: "#14b8a6" },
  { name: "Health", kind: "expense", color: "#ef4444" },
  { name: "Shopping", kind: "expense", color: "#ec4899" },
  { name: "Entertainment", kind: "expense", color: "#a855f7" },
  { name: "Education", kind: "expense", color: "#3b82f6" },
  { name: "Gifts & Donations", kind: "expense", color: "#f43f5e" },
  { name: "Other", kind: "expense", color: "#64748b" },
  { name: "Salary", kind: "income", color: "#22c55e" },
  { name: "Bonus", kind: "income", color: "#10b981" },
  { name: "Freelance", kind: "income", color: "#0ea5e9" },
  { name: "Investment", kind: "income", color: "#6366f1" },
  { name: "Other", kind: "income", color: "#64748b" },
];

export function defaultCategoryRows(userId: string) {
  return DEFAULT_CATEGORIES.map((category, index) => ({
    userId,
    name: category.name,
    kind: category.kind,
    color: category.color,
    sortOrder: index,
  }));
}
