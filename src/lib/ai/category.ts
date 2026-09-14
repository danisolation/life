export const NO_CATEGORY = "--none--";

export function buildCategoryPrompt(note: string, kind: "income" | "expense", names: string[]): string {
  return [
    `Pick the single best category for a ${kind} described as: "${note.trim().slice(0, 200)}".`,
    `Choose exactly one of these names: ${names.join(", ")}.`,
    `If none of them fits, answer ${NO_CATEGORY}. Never invent a new name.`,
  ].join("\n");
}

export function categorySchema(names: string[]): object {
  return {
    type: "OBJECT",
    properties: { category: { type: "STRING", enum: [...names, NO_CATEGORY] } },
    required: ["category"],
  };
}

export function parseCategorySuggestion(text: string, names: string[]): string | null {
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const picked = (raw as Record<string, unknown>).category;
  if (typeof picked !== "string") return null;

  const wanted = picked.trim().toLowerCase();
  if (!wanted) return null;

  return names.find((name) => name.toLowerCase() === wanted) ?? null;
}
