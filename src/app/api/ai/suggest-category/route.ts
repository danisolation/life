import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { readJson } from "@/lib/validate";
import { generateJson, geminiConfigured } from "@/lib/ai/gemini";
import { buildCategoryPrompt, categorySchema, parseCategorySuggestion } from "@/lib/ai/category";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const note = typeof body.note === "string" ? body.note.trim() : "";
  const kind = body.kind;

  if (!note || note.length > 200) {
    return NextResponse.json({ error: "Note must be 1-200 characters" }, { status: 400 });
  }
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }

  // A suggestion is a bonus: whenever it cannot be produced the client just
  // shows nothing, so every dead end answers with a null category.
  if (!geminiConfigured()) return NextResponse.json({ categoryId: null });

  const options = await db.query.categories.findMany({
    where: and(eq(categories.userId, user.id), eq(categories.kind, kind)),
  });
  const usable = options.filter((category) => !category.archivedAt);
  if (!usable.length) return NextResponse.json({ categoryId: null });

  const names = usable.map((category) => category.name);

  try {
    const answer = await generateJson({
      parts: [{ text: buildCategoryPrompt(note, kind, names) }],
      schema: categorySchema(names),
      maxOutputTokens: 256,
      thinkingBudget: 0,
    });
    const picked = parseCategorySuggestion(answer, names);
    if (!picked) return NextResponse.json({ categoryId: null });

    const match = usable.find((category) => category.name === picked);
    return NextResponse.json({ categoryId: match?.id ?? null, name: match?.name ?? null });
  } catch (error) {
    console.error("category suggestion failed", error);
    return NextResponse.json({ categoryId: null });
  }
}
