import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isMonth, readJson } from "@/lib/validate";
import { loadMonthView } from "@/lib/money-data";
import { formatMoney } from "@/lib/money/amount";
import { formatMonthLabel, formatPercent } from "@/lib/format";
import { todayKey } from "@/lib/money/period";
import { generateJson, geminiConfigured, geminiErrorMessage } from "@/lib/ai/gemini";
import { SUMMARY_SCHEMA, buildSummaryPrompt, parseSummary } from "@/lib/ai/summary";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const month = typeof body.month === "string" ? body.month : "";
  if (!isMonth(month)) {
    return NextResponse.json({ error: "Month must look like 2026-09" }, { status: 400 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json(
      { error: "The writer is not configured on this server" },
      { status: 503 }
    );
  }

  const money = { currency: user.currency, locale: user.locale };
  const view = await loadMonthView(user.id, month, todayKey(), money);
  const { summary } = view;

  if (summary.transactionCount === 0) {
    return NextResponse.json(
      { error: "Nothing recorded in that month yet." },
      { status: 400 }
    );
  }

  const facts = {
    month: formatMonthLabel(month, user.locale),
    income: formatMoney(summary.incomeMinor, money.currency, money.locale),
    expenses: formatMoney(summary.expenseMinor, money.currency, money.locale),
    leftOver: formatMoney(summary.netMinor, money.currency, money.locale),
    savingsRate: formatPercent(summary.savingsRate * 100),
    topCategories: summary.byCategory
      .slice(0, 5)
      .map((row) => ({
        name: row.name,
        total: formatMoney(row.totalMinor, money.currency, money.locale),
      })),
    budgets: view.lines.slice(0, 5).map((line) => ({
      name: line.name,
      spent: formatMoney(line.spentMinor, money.currency, money.locale),
      limit: formatMoney(line.limitMinor, money.currency, money.locale),
    })),
    insights: view.insights.slice(0, 8).map((insight) => `${insight.title} ${insight.detail}`),
  };

  try {
    const answer = await generateJson({
      parts: [{ text: buildSummaryPrompt(facts, user.locale) }],
      schema: SUMMARY_SCHEMA,
      maxOutputTokens: 1200,
      thinkingBudget: 0,
    });
    const written = parseSummary(answer);
    if (!written) {
      console.error("month summary was unreadable", answer.slice(0, 200));
      return NextResponse.json(
        { error: "The writer returned nothing usable. Try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ summary: written });
  } catch (error) {
    console.error("month summary failed", error);
    const { message, status } = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
