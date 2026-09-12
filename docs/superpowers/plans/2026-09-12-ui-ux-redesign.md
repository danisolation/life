# UI/UX Redesign (Calm Ops Console) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the design system, app shell, and interaction/accessibility layer of Life Admin OS
so the interface actually reflects its product principle — reduce anxiety around personal life admin.

**Architecture:** The design token layer in `src/app/globals.css` is replaced (real light + dark
palettes, semantic status tokens, fixed font wiring). Everything above it is then swept onto those
tokens: a repaired app shell, a lucide-based icon system replacing emoji, four small shared
primitives, route-level loading/error states, and fixes for every verified defect. No new runtime
dependencies. `src/components/ui/*` (shadcn) is **never** hand-edited — project convention.

**Tech Stack:** Next.js 16.3.4 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
(`@theme inline`) · shadcn `base-nova` · lucide-react · Drizzle/PostgreSQL · Node 22.14 built-in
test runner (`node --test` + `--experimental-strip-types`) — no test framework installed.

**Spec:** `docs/superpowers/specs/2026-09-12-ui-ux-redesign-design.md` — read it alongside this plan.
Sections §3.3, §3.4, and §3.5 of the spec contain the verbatim token CSS and the contrast table, and
are referenced (not duplicated) below.

## Global Constraints

- **No new dependencies.** Not for theming, not for testing, not for icons (lucide-react is already installed).
- **Never edit `src/components/ui/*`.** `docs/DEVELOPMENT.md` §6: shadcn primitives are managed by `npx shadcn add`. All changes happen at call sites.
- **TypeScript strict must be clean:** `npx tsc --noEmit` is the primary gate for every task.
- **UI strings stay English.** `lang="en"` stays. `toLocaleDateString("en-US")` stays.
- **`--success` and `--warning` must never be a solid background with white text** (amber + white fails AA). Status surfaces always use the `*-muted` background + `*-muted-foreground` text pair.
- **No hand-committed changes:** repo already has uncommitted work in `README.md`, `docs/ROADMAP.md`, `docs/TROUBLESHOOTING.md`, `src/app/(dashboard)/deadlines/page.tsx`, `src/app/(dashboard)/life/[type]/[id]/page.tsx`, `src/app/api/entities/[id]/route.ts`, `src/components/deadlines/deadline-list.tsx`, `src/lib/ai/provider.ts`, plus untracked `src/components/entities/entity-attributes-editor.tsx`. Commit commands below use **explicit paths only** — never `git add -A`.
- **Verification commands:** `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build`

---

## File Structure

**Created (7 + 2 test/config):**

| Path | Responsibility |
|------|----------------|
| `src/lib/deadline-urgency.ts` | Pure date math + urgency bucketing. Zero React, zero imports. |
| `src/lib/deadline-urgency.test.ts` | `node --test` self-check for the above. |
| `src/components/layout/theme-toggle.tsx` | Client toggle, owns `localStorage.theme` + `documentElement.classList`. |
| `src/components/layout/page-header.tsx` | Page `<h1>` + description + action slot. Replaces 8 hand-rolled blocks. |
| `src/components/layout/empty-state.tsx` | Icon + message + optional action, centered. |
| `src/components/status-badge.tsx` | The single place domain status → color token is mapped. |
| `src/app/(dashboard)/loading.tsx` | Route-level skeleton. |
| `src/app/(dashboard)/error.tsx` | Route-level error boundary with retry. |
| `src/app/(dashboard)/not-found.tsx` | Route-level 404. |

**Deleted (1):** `src/components/entities/entity-tabs.tsx` — renders a `TabsList` with no
`TabsContent`, so it is inert; `life/page.tsx` already groups by type with counts.

**Modified (32):** see per-task file lists. Summary in spec §10.

---

## Testing Strategy (read before Task 1)

This repo has **no test framework** (`package.json` has no `test` script; no vitest/jest/RTL
anywhere) and the spec forbids adding dependencies. So:

- **Pure logic** (date math, urgency bucketing) gets a real test — `node --test` is built into Node
  22.14, and `--experimental-strip-types` runs `.ts` directly. Verified working on this machine.
- **Presentational changes** (tokens, markup, class names) are gated by `npx tsc --noEmit`,
  `npm run lint`, `npm run build`, plus the specific browser checks named in each task. Writing a
  component test for `bg-success-muted` would assert on a class string and prove nothing.

---

## Task 1: Design tokens, font wiring, and a working dark mode

**Files:**
- Modify: `src/app/globals.css` (replace `@theme inline` font lines; add status tokens; replace `:root` and `.dark` value blocks)
- Modify: `src/app/layout.tsx` (blocking theme script, `suppressHydrationWarning`, mount toggle)
- Create: `src/components/layout/theme-toggle.tsx`
- Modify: `src/components/layout/navigation.tsx` (mount `<ThemeToggle />` in sidebar footer only — restructure happens in Task 5)

**Interfaces:**
- Consumes: nothing
- Produces: CSS custom properties `--success`, `--success-muted`, `--success-muted-foreground`, `--warning`, `--warning-muted`, `--warning-muted-foreground`, `--info`, `--info-muted`, `--info-muted-foreground` (both `:root` and `.dark`); Tailwind utilities `bg-success-muted`, `text-success-muted-foreground`, `border-warning-muted`, etc.; component `ThemeToggle` (no props)

- [ ] **Step 1: Fix the circular font declaration**

In `src/app/globals.css`, inside `@theme inline`, find:

```css
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
```

Replace with:

```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);
```

Why: `--font-sans: var(--font-sans)` references itself; nothing ever assigned `--font-sans`, so
`html { @apply font-sans }` resolved to nothing and the browser default font was used app-wide.

- [ ] **Step 2: Add the semantic status tokens to `@theme inline`**

Append inside the same `@theme inline` block, after the existing `--color-sidebar-*` lines:

```css
  --color-success: var(--success);
  --color-success-muted: var(--success-muted);
  --color-success-muted-foreground: var(--success-muted-foreground);
  --color-warning: var(--warning);
  --color-warning-muted: var(--warning-muted);
  --color-warning-muted-foreground: var(--warning-muted-foreground);
  --color-info: var(--info);
  --color-info-muted: var(--info-muted);
  --color-info-muted-foreground: var(--info-muted-foreground);
```

- [ ] **Step 3: Replace the `:root` and `.dark` value blocks**

Replace the entire existing `:root { … }` block with the values in **spec §3.3**, and the entire
existing `.dark { … }` block with the values in **spec §3.4**. Copy them verbatim — every value is
load-bearing. Keep the existing `@custom-variant dark (&:is(.dark *));` line and the
`@layer base { … }` block unchanged.

Note: `--ring` changes from `oklch(0.708 0 0)` to the primary blue in both themes — this is the fix
for invisible focus rings. `--sidebar` and `--sidebar-*` are updated in lockstep so the sidebar
keeps working before Task 5 restructures it. Leave `--chart-*` untouched (no charts exist yet).

- [ ] **Step 4: Add the blocking theme script and `suppressHydrationWarning`**

In `src/app/layout.tsx`, replace the `<html …>` opening tag and add a `<head>`:

```tsx
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
```

Why `suppressHydrationWarning`: the server cannot know the client's stored theme, so `class` on
`<html>` legitimately differs. Why the inline script and not `useEffect`: it must run **before**
first paint or dark-mode users see a white flash.

- [ ] **Step 5: Create the theme toggle**

Create `src/components/layout/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
```

Why `useState(false)` + `useEffect` rather than reading the DOM during render: the server must render
deterministically. Reading the class during render would produce a hydration mismatch. The effect
runs after hydration and is allowed to update.

Note: the icon has no explicit size class — `button.tsx` already applies
`[&_svg:not([class*='size-'])]:size-4`.

- [ ] **Step 6: Mount the toggle in the sidebar footer**

In `src/components/layout/navigation.tsx`, inside the `Sidebar` component, add the toggle at the
bottom of `<aside>`, after the closing `</nav>`:

```tsx
      <div className="flex items-center justify-end border-t p-2">
        <ThemeToggle />
      </div>
```

Add the import at the top:

```tsx
import { ThemeToggle } from "@/components/layout/theme-toggle";
```

- [ ] **Step 7: Verify the font actually applies**

Run: `npm run build`
Expected: build succeeds.

Then run `npm run dev`, open any page, and in DevTools → Elements → Computed check the `font-family`
on `<body>`.
Expected: a value containing `Geist` (via the `--font-geist-sans` variable). Before this task it
was the browser default (`Times New Roman` / `serif`-ish on most systems). **Do not skip this check**
— it is the only way to confirm D1 is fixed, and it will not show up in `tsc` or `lint`.

- [ ] **Step 8: Verify dark mode end to end**

With `npm run dev` running:

1. Click the toggle → background goes dark, text stays readable.
2. Reload → theme persists (no flash of light theme).
3. DevTools → Rendering → "Emulate `prefers-color-scheme: dark`", clear `localStorage.theme` via
   Application → Local Storage, then reload → dark without ever having toggled.
4. Toggle back to light, reload → stays light.

- [ ] **Step 9: Measure contrast in both themes**

In DevTools, with dark mode on, pick the following pairs and read the computed contrast ratio
(DevTools shows it in the color picker's contrast section):

| Foreground | Background | Required |
|-----------|-----------|----------|
| `--muted-foreground` text | `--background` | ≥4.5:1 |
| body text | `--background` | ≥4.5:1 |
| `--destructive` text | `--background` | ≥4.5:1 |

Repeat with light mode. The spec §3.5 table is an **estimate**, not a measurement — this step is what
converts it into a fact. If any pair fails, darken/lighten the offending token in `globals.css` and
re-measure before continuing.

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/layout/theme-toggle.tsx src/components/layout/navigation.tsx
git commit -F - <<'EOF'
Redesign step 1: design tokens, font wiring, working dark mode

- Fix --font-sans self-reference that left the app on the browser default font
- Add semantic success/warning/info token families (muted + muted-foreground pairs)
- Point --ring at the primary blue so focus rings are visible
- Add a no-dependency theme toggle: blocking inline script, localStorage, system preference

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 2: Replace emoji icons with lucide across the entity type system

**Files:**
- Modify: `src/types/index.ts` (the `ENTITY_TYPE_CONFIG` table)
- Modify: `src/components/entities/entity-list.tsx`
- Modify: `src/components/entities/entity-create-dialog.tsx`
- Modify: `src/components/entities/entity-relations-manager.tsx`
- Modify: `src/components/deadlines/deadline-list.tsx`
- Modify: `src/components/inbox/inbox-upload.tsx`
- Modify: `src/app/(dashboard)/life/page.tsx`
- Modify: `src/app/(dashboard)/life/[type]/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: LucideIcon; color: string }>` — `icon` changes type from `string` to `LucideIcon`

This task must land atomically: changing the type breaks every call site at once, so all seven files
are updated together and `tsc` is the gate.

- [ ] **Step 1: Change the icon type and values**

In `src/types/index.ts`, add the import at the top of the file:

```ts
import type { LucideIcon } from "lucide-react";
```

Add the named imports of the icons (top of file, after the type import):

```ts
import {
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  ReceiptText,
  Wallet,
  FileText,
  AlarmClock,
  CircleCheck,
  Building2,
  User,
  Paperclip,
} from "lucide-react";
```

Replace the `ENTITY_TYPE_CONFIG` declaration with:

```ts
export const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { label: string; icon: LucideIcon; color: string }
> = {
  asset:        { label: "Asset",        icon: Package,      color: "blue"   },
  subscription: { label: "Subscription", icon: RefreshCw,    color: "purple" },
  warranty:     { label: "Warranty",     icon: ShieldCheck,  color: "green"  },
  purchase:     { label: "Purchase",     icon: ShoppingCart, color: "orange" },
  receipt:      { label: "Receipt",      icon: ReceiptText,  color: "yellow" },
  bill:         { label: "Bill",         icon: Wallet,       color: "red"    },
  contract:     { label: "Contract",     icon: FileText,     color: "indigo" },
  deadline:     { label: "Deadline",     icon: AlarmClock,   color: "pink"   },
  task:         { label: "Task",         icon: CircleCheck,  color: "teal"   },
  provider:     { label: "Provider",     icon: Building2,    color: "gray"   },
  person:       { label: "Person",       icon: User,         color: "cyan"   },
  document:     { label: "Document",     icon: Paperclip,    color: "slate"  },
};
```

Leave the `color` field values as they are — nothing reads them yet.

- [ ] **Step 2: Confirm the type change broke the call sites**

Run: `npx tsc --noEmit`
Expected: FAIL with errors like `Type 'LucideIcon' is not assignable to type 'ReactNode'` at
`entity-list.tsx`, `entity-create-dialog.tsx`, `entity-relations-manager.tsx`, `deadline-list.tsx`,
`inbox-upload.tsx`, `life/page.tsx`, and `live/[type]/[id]/page.tsx`. This confirms the call-site
list in this task is complete — if tsc names a file not listed above, add it.

- [ ] **Step 3: Fix `entity-list.tsx`**

Replace:

```tsx
                  <div className="flex items-center gap-2">
                    <span>{config?.icon}</span>
                    <span className="font-medium text-sm truncate max-w-[150px]">
                      {entity.name}
                    </span>
                  </div>
```

with:

```tsx
                  <div className="flex min-w-0 items-center gap-2">
                    {config && <config.icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate text-sm font-medium">{entity.name}</span>
                  </div>
```

Two changes beyond the icon: `max-w-[150px]` was a hardcoded width that clipped names on narrow
screens — `min-w-0` on the flex parent plus `truncate` on the child lets it shrink properly.

- [ ] **Step 4: Fix `entity-create-dialog.tsx`**

Replace the `SelectItem` body:

```tsx
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTITY_TYPE_CONFIG[t].icon} {ENTITY_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
```

with:

```tsx
                {ENTITY_TYPES.map((t) => {
                  const Icon = ENTITY_TYPE_CONFIG[t].icon;
                  return (
                    <SelectItem key={t} value={t}>
                      <Icon />
                      <span>{ENTITY_TYPE_CONFIG[t].label}</span>
                    </SelectItem>
                  );
                })}
```

The icon needs no size class: `ui/select.tsx` line 119 already declares
`[&_svg:not([class*='size-'])]:size-4`. The `<span>` wrapper is required to match that primitive's
`*:[span]:last:flex` rule.

- [ ] **Step 5: Fix `inbox-upload.tsx`**

Apply the identical `SelectItem` transformation as Step 4 (same `ENTITY_TYPES.map` block, same
resulting code).

- [ ] **Step 6: Fix `deadline-list.tsx`**

Replace:

```tsx
                                <Link
                                  href={`/life/${item.entityType}/${item.entityId}`}
                                  className="font-medium text-foreground hover:underline"
                                >
                                  {entityConfig.icon} {item.entityName}
                                </Link>
```

with:

```tsx
                                <Link
                                  href={`/life/${item.entityType}/${item.entityId}`}
                                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                                >
                                  <entityConfig.icon aria-hidden className="h-3 w-3" />
                                  {item.entityName}
                                </Link>
```

- [ ] **Step 7: Fix `entity-relations-manager.tsx`**

This file renders the entity icon in **two** places. In both, replace:

```tsx
                <span>{ENTITY_TYPE_CONFIG[rel.entityType as EntityType]?.icon}</span>
```

with:

```tsx
                {(() => {
                  const Icon = ENTITY_TYPE_CONFIG[rel.entityType as EntityType]?.icon;
                  return Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0" /> : null;
                })()}
```

An inline IIFE is used because the value is `| undefined` and JSX requires a capitalised identifier;
introducing a helper component for two call sites in the same file is not worth it.

- [ ] **Step 8: Fix `life/page.tsx`**

Replace:

```tsx
              <div className="flex items-center gap-2">
                <span className="text-xl">{config?.icon}</span>
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm text-muted-foreground">
                  ({items.length})
                </span>
              </div>
```

with:

```tsx
              <div className="flex items-center gap-2">
                {config && <config.icon aria-hidden className="h-4 w-4 text-muted-foreground" />}
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm text-muted-foreground">
                  ({items.length})
                </span>
              </div>
```

- [ ] **Step 9: Fix `life/[type]/[id]/page.tsx`**

Replace:

```tsx
        <div className="flex items-start gap-3">
          <span className="text-4xl">{config?.icon}</span>
```

with:

```tsx
        <div className="flex items-start gap-3">
          {config && <config.icon aria-hidden className="h-8 w-8 shrink-0 text-muted-foreground" />}
```

- [ ] **Step 10: Verify no emoji remain and types are clean**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

Run: `npm run lint`
Expected: PASS.

Run this search — it must return **no results**:

```
grep -rn "📦\|🔄\|🛡️\|🛒\|🧾\|💰\|📄\|⏰\|✅\|🏢\|👤\|📎" src/
```

Use the grep tool (ripgrep), not a shell `grep`. If any emoji remain, they are in a file not listed
in this task — add it.

- [ ] **Step 11: Commit**

```bash
git add src/types/index.ts src/components/entities/entity-list.tsx src/components/entities/entity-create-dialog.tsx src/components/entities/entity-relations-manager.tsx src/components/deadlines/deadline-list.tsx src/components/inbox/inbox-upload.tsx "src/app/(dashboard)/life/page.tsx" "src/app/(dashboard)/life/[type]/[id]/page.tsx"
git commit -F - <<'EOF'
Redesign step 2: replace emoji with lucide icons for all 12 entity types

ENTITY_TYPE_CONFIG.icon changes from string to LucideIcon. Emoji were
font-dependent, unthemeable, and unstyleable in size and stroke.

Also fixes a hardcoded max-w-[150px] in entity-list that clipped names.

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 3: Shared primitives — PageHeader, EmptyState, StatusBadge

**Files:**
- Create: `src/components/layout/page-header.tsx`
- Create: `src/components/layout/empty-state.tsx`
- Create: `src/components/status-badge.tsx`
- Modify: `src/app/(dashboard)/inbox/page.tsx` (first consumer of `PageHeader`)
- Modify: `src/components/tasks/task-list.tsx` (first consumer of `EmptyState`)
- Modify: `src/components/inbox/inbox-items.tsx` (first consumer of `StatusBadge` + `Skeleton`)

**Interfaces:**
- Consumes: status tokens from Task 1
- Produces:
  - `PageHeader(props: { title: string; description?: string; action?: React.ReactNode })`
  - `EmptyState(props: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode })`
  - `StatusBadge(props: { tone: StatusTone; children: React.ReactNode; className?: string })` where `type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"`
  - `urgencyTone(days: number): StatusTone`
  - `priorityTone(priority: string): StatusTone`
  - `documentTone(status: string): StatusTone`
  - `taskStatusTone(status: string): StatusTone`

Each primitive gets one real consumer in this task so the task ends with something observable rather
than three unused files.

- [ ] **Step 1: Create `PageHeader`**

Create `src/components/layout/page-header.tsx`:

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

Note the type scale change: `text-3xl` → `text-2xl`. The old size competed with the page content and
is too heavy for a dense dashboard; `text-2xl font-semibold` keeps a clear hierarchy while letting
the data be the loudest thing on the page.

- [ ] **Step 2: Create `EmptyState`**

Create `src/components/layout/empty-state.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Create `StatusBadge`**

Create `src/components/status-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "",
  info: "border-transparent bg-info-muted text-info-muted-foreground",
  success: "border-transparent bg-success-muted text-success-muted-foreground",
  warning: "border-transparent bg-warning-muted text-warning-muted-foreground",
  danger: "",
};

const toneVariants: Record<StatusTone, "secondary" | "destructive"> = {
  neutral: "secondary",
  info: "secondary",
  success: "secondary",
  warning: "secondary",
  danger: "destructive",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant={toneVariants[tone]} className={`${toneClasses[tone]} ${className ?? ""}`.trim()}>
      {children}
    </Badge>
  );
}

export function urgencyTone(days: number): StatusTone {
  if (days < 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "info";
  return "neutral";
}

export function priorityTone(priority: string): StatusTone {
  switch (priority) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "neutral";
    default:
      return "neutral";
  }
}

export function documentTone(status: string): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "processing":
      return "info";
    default:
      return "neutral";
  }
}

export function taskStatusTone(status: string): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}
```

`danger` deliberately reuses the shadcn `destructive` variant (which is already the
`bg-destructive/10 text-destructive` pair) rather than a new token — it is the one tone allowed to
be loud. The `border-transparent` on the muted tones overrides the `Badge` base's
`border border-transparent` safely and keeps the muted fill edge-to-edge.

- [ ] **Step 4: Convert `inbox/page.tsx` to `PageHeader`**

Replace the header block:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Life Admin Inbox</h1>
        <p className="text-muted-foreground">
          Upload receipts, bills, warranties, and documents. AI will extract and organize the information.
        </p>
      </div>
```

with:

```tsx
      <PageHeader
        title="Inbox"
        description="Upload receipts, bills, warranties, and documents. AI will extract and organize the information."
      />
```

Add the import:

```tsx
import { PageHeader } from "@/components/layout/page-header";
```

The title changes from "Life Admin Inbox" to "Inbox" to match the navigation label.

- [ ] **Step 5: Convert `task-list.tsx` empty state and priority dot**

Replace the early-return block:

```tsx
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No tasks yet. Create one, or convert a deadline into a task.
          </p>
        </CardContent>
      </Card>
    );
  }
```

with:

```tsx
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Create one, or convert a deadline into a task."
          />
        </CardContent>
      </Card>
    );
  }
```

Add to the `lucide-react` import: `ListChecks`. Add:

```tsx
import { EmptyState } from "@/components/layout/empty-state";
```

Then delete the `getPriorityColor` function entirely and replace its use:

```tsx
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      <span className="capitalize">{task.priority}</span>
                    </div>
```

with:

```tsx
                    <StatusBadge tone={priorityTone(task.priority)}>
                      <span className="capitalize">{task.priority}</span>
                    </StatusBadge>
```

And replace the status badge usage. Delete `getStatusBadge` and replace its call site:

```tsx
                    {getStatusBadge(task.status)}
```

with:

```tsx
                    <StatusBadge tone={taskStatusTone(task.status)}>
                      {task.status === "in_progress"
                        ? "In Progress"
                        : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </StatusBadge>
```

Add the import:

```tsx
import { StatusBadge, priorityTone, taskStatusTone } from "@/components/status-badge";
```

Why the colour dot is replaced rather than recoloured: a bare coloured dot with no text alternative
communicates priority by colour alone. The badge carries the word.

- [ ] **Step 6: Convert `inbox-items.tsx` statuses and loading state**

Delete `getStatusIcon` and `getStatusBadge` entirely. Replace the loading branch:

```tsx
        {isLoading ? (
          <p className="text-center text-muted-foreground py-6">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No documents yet. Upload your first receipt or bill above.
          </p>
        ) : (
```

with:

```tsx
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first receipt or bill above."
          />
        ) : (
```

Then replace the per-row status rendering:

```tsx
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  {getStatusBadge(doc.status)}
                </div>
```

with:

```tsx
                <StatusBadge tone={documentTone(doc.status)}>
                  {doc.status === "completed"
                    ? "Processed"
                    : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </StatusBadge>
```

Update imports — add:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, documentTone } from "@/components/status-badge";
```

and remove `CheckCircle`, `Clock`, `AlertCircle` from the `lucide-react` import, keeping `FileText`.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

With `npm run dev` running, open `/inbox` and `/tasks`:
- `/inbox` shows a skeleton for a moment on load, then rows with a colored status pill.
- `/tasks` with no tasks shows the icon + "No tasks yet".
- Check both in light and dark mode — the pills must be readable in both.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/page-header.tsx src/components/layout/empty-state.tsx src/components/status-badge.tsx "src/app/(dashboard)/inbox/page.tsx" src/components/tasks/task-list.tsx src/components/inbox/inbox-items.tsx
git commit -F - <<'EOF'
Redesign step 3: add PageHeader, EmptyState, StatusBadge primitives

StatusBadge becomes the single place a domain status maps to a colour token,
replacing the per-component colour switches and hardcoded palette classes.
EmptyState replaces six copies of a bare centred paragraph. Loading text in
the inbox becomes a skeleton.

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 4: Extract date logic into a tested pure module

**Files:**
- Create: `src/lib/deadline-urgency.ts`
- Create: `src/lib/deadline-urgency.test.ts`
- Modify: `package.json` (add `test` script)
- Modify: `tsconfig.json` (add `allowImportingTsExtensions`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `startOfToday(now?: Date): Date`
  - `daysUntil(date: Date | string, today: Date): number` — `today` is **required**; callers pass a stable value so nothing reads the clock mid-render
  - `type Urgency = "overdue" | "today" | "soon" | "later"`
  - `urgencyOf(days: number): Urgency`

This is the only task with a real test. It exists because the app computes "days until" in four
separate places with four slightly different implementations, one of which calls `Date.now()` during
render (hydration mismatch risk).

- [ ] **Step 1: Enable TypeScript imports with explicit extensions**

In `tsconfig.json`, add `"allowImportingTsExtensions": true` to `compilerOptions`, directly after
`"noEmit": true,`:

```json
    "noEmit": true,
    "allowImportingTsExtensions": true,
```

Why: the Node test runner resolves `./deadline-urgency.ts` with its extension; `tsc` rejects that
specifier unless this flag is on. It is only legal together with `noEmit`, which this project already
sets.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`, directly after `"lint": "eslint",`:

```json
    "test": "node --experimental-strip-types --test \"src/**/*.test.ts\"",
```

Node expands the glob itself (verified on this machine — the shell does not need to). No framework,
no dependency, no config file.

- [ ] **Step 3: Write the failing test**

Create `src/lib/deadline-urgency.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, startOfToday, urgencyOf } from "./deadline-urgency.ts";

test("startOfToday zeroes the time component", () => {
  const result = startOfToday(new Date(2026, 8, 12, 17, 43, 21, 500));
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 8);
  assert.equal(result.getDate(), 12);
  assert.equal(result.getHours(), 0);
  assert.equal(result.getMinutes(), 0);
  assert.equal(result.getSeconds(), 0);
  assert.equal(result.getMilliseconds(), 0);
});

test("daysUntil returns 0 for a time later today", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 12, 23, 30, 0), today), 0);
});

test("daysUntil returns 1 for tomorrow", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 13, 0, 0, 1), today), 1);
});

test("daysUntil returns -1 for yesterday", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 8, 11, 23, 59, 59), today), -1);
});

test("daysUntil accepts an ISO string", () => {
  const today = startOfToday(new Date(2026, 8, 12, 9, 0, 0));
  const iso = new Date(2026, 8, 15, 12, 0, 0).toISOString();
  assert.equal(daysUntil(iso, today), 3);
});

test("daysUntil crosses a month boundary", () => {
  const today = startOfToday(new Date(2026, 8, 30, 9, 0, 0));
  assert.equal(daysUntil(new Date(2026, 9, 2, 9, 0, 0), today), 2);
});

test("daysUntil crosses the spring DST boundary in a 23-hour day", () => {
  // 2026-03-08 is US spring-forward; that local day is 23 hours long.
  const today = startOfToday(new Date(2026, 2, 7, 12, 0, 0));
  assert.equal(daysUntil(new Date(2026, 2, 8, 12, 0, 0), today), 1);
});

test("urgencyOf buckets by distance", () => {
  assert.equal(urgencyOf(-5), "overdue");
  assert.equal(urgencyOf(-1), "overdue");
  assert.equal(urgencyOf(0), "today");
  assert.equal(urgencyOf(1), "soon");
  assert.equal(urgencyOf(7), "soon");
  assert.equal(urgencyOf(8), "later");
  assert.equal(urgencyOf(365), "later");
});
```

Note on the DST test: it asserts that bucketing uses calendar-day arithmetic, not elapsed
milliseconds. An implementation that divides a raw millisecond delta by 86_400_000 returns 0 there
and fails — which is exactly the bug this module exists to prevent.

- [ ] **Step 4: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './deadline-urgency.ts'` (the module does not exist yet).

- [ ] **Step 5: Implement the module**

Create `src/lib/deadline-urgency.ts`:

```ts
const DAY_MS = 1000 * 60 * 60 * 24;

export type Urgency = "overdue" | "today" | "soon" | "later";

export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(date: Date | string, today: Date): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function urgencyOf(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}
```

The `Math.round` is what makes the DST test pass: on a 23-hour local day the raw delta is
82_800_000 ms → `Math.floor` would give 0, `Math.round` gives 1, which matches the calendar answer.

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — 8 tests, 0 failures.

- [ ] **Step 7: Confirm types are still clean**

Run: `npx tsc --noEmit`
Expected: PASS. If `tsc` complains about the `.ts` extension in the test's import, Step 1 was not
applied correctly.

- [ ] **Step 8: Commit**

```bash
git add src/lib/deadline-urgency.ts src/lib/deadline-urgency.test.ts package.json tsconfig.json
git commit -F - <<'EOF'
Redesign step 4: extract tested date/urgency module

Four components each computed days-until slightly differently, one of them
calling Date.now() during render. This consolidates the maths into one pure
module with a calendar-day-correct implementation.

Tested with the Node 22 built-in runner plus --experimental-strip-types, so
no test framework dependency is added.

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 5: Restructure the app shell

**Files:**
- Modify: `src/components/layout/navigation.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 1
- Produces: nothing consumed downstream

- [ ] **Step 1: Fix the viewport unit and scroll containment**

In `src/app/(dashboard)/layout.tsx`, replace:

```tsx
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
```

with:

```tsx
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto overscroll-contain pb-16 lg:pb-0">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
```

`h-screen` (`100vh`) is taller than the visible area on mobile browsers with a dynamic URL bar, which
pushes content under the browser chrome. `h-dvh` tracks the real viewport. `pb-16` replaces `pb-14`
so the fixed bottom nav plus its safe-area padding never covers the last row of content.

- [ ] **Step 2: Group the navigation destinations**

In `src/components/layout/navigation.tsx`, replace the flat `navigation` array with:

```tsx
const navigationGroups = [
  {
    label: "Capture",
    items: [{ name: "Inbox", href: "/inbox", icon: Inbox }],
  },
  {
    label: "Track",
    items: [
      { name: "Life", href: "/life", icon: Network },
      { name: "Deadlines", href: "/deadlines", icon: CalendarClock },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Assist",
    items: [
      { name: "AI", href: "/ai", icon: Bot },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const homeItem = { name: "Home", href: "/", icon: Home };

const allDestinations = [homeItem, ...navigationGroups.flatMap((g) => g.items)];
```

Add a shared active-state helper above the components:

```tsx
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
```

- [ ] **Step 3: Rewrite `Sidebar` with groups, a calmer active state, and the toggle**

Replace the whole `Sidebar` function with:

```tsx
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network aria-hidden className="h-5 w-5" />
          <span>Life Admin OS</span>
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto p-3">
        <Link
          href={homeItem.href}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, homeItem.href)
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {isActive(pathname, homeItem.href) && (
            <span aria-hidden className="absolute left-0 h-4 w-0.5 rounded-full bg-primary" />
          )}
          <homeItem.icon aria-hidden className="h-4 w-4 shrink-0" />
          {homeItem.name}
        </Link>

        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 h-4 w-0.5 rounded-full bg-primary"
                    />
                  )}
                  <item.icon aria-hidden className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-end border-t p-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}
```

The active state changes from a solid `bg-primary text-primary-foreground` block to `bg-muted` plus a
2px primary rail. Seven flat destinations each filled with the darkest colour in the palette made the
sidebar the loudest element on every screen — the opposite of the product's intent. `--primary` is
now reserved for the rail and genuine signals.

- [ ] **Step 4: Rewrite `MobileNav` to reach every destination**

Replace the whole `MobileNav` function with:

```tsx
const primaryMobileHrefs = ["/", "/inbox", "/life", "/tasks"];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = allDestinations.filter((d) => primaryMobileHrefs.includes(d.href));
  const overflow = allDestinations.filter((d) => !primaryMobileHrefs.includes(d.href));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex items-stretch">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon aria-hidden className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More destinations"
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <Menu aria-hidden className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-4">
            {allDestinations.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                    active ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon aria-hidden className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

This is the fix for D5: the old version rendered `navigation.slice(0, 5)`, so `/ai` and `/settings`
were unreachable on mobile. Every destination is now reachable, `min-h-14`/`min-h-11` meet the 44px
touch-target floor, and `env(safe-area-inset-bottom)` keeps the bar clear of the home indicator.

- [ ] **Step 5: Update the imports in `navigation.tsx`**

The final import block must be:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Inbox,
  Network,
  CalendarClock,
  CheckSquare,
  Bot,
  Settings,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
```

`useState` and `Menu` are new. `cn` was already imported.

- [ ] **Step 6: Verify the shell**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run lint` → PASS.
Run: `npm run build` → PASS.

With `npm run dev` running, at a 375px viewport:
1. The bottom bar shows Home, Inbox, Life, Tasks, More.
2. Tap **More** → the sheet lists all 7 destinations plus the theme toggle.
3. Tap **AI** → navigates to `/ai` and the sheet closes.
4. Scroll to the bottom of a long page (e.g. a seeded `/life`) → the last row is fully visible above
   the bar.
5. Deselect mobile emulation → the sidebar shows the three group labels and a theme toggle at the
   bottom right.

Keyboard: Tab from the top of the page → focus reaches sidebar links with a visible ring (the ring
colour changed to primary in Task 1).

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/navigation.tsx "src/app/(dashboard)/layout.tsx"
git commit -F - <<'EOF'
Redesign step 5: restructure the app shell

- Group sidebar destinations into Capture / Track / Assist
- Replace the solid active pill with a muted fill plus a 2px primary rail
- Mobile: replace slice(0,5) with 4 primary targets plus a More sheet so
  /ai and /settings are reachable again
- Respect safe-area insets and meet the 44px touch-target floor
- h-screen -> h-dvh so mobile browser chrome stops clipping the layout

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 6: Route-level loading, error, and not-found states

**Files:**
- Create: `src/app/(dashboard)/loading.tsx`
- Create: `src/app/(dashboard)/error.tsx`
- Create: `src/app/(dashboard)/not-found.tsx`

**Interfaces:**
- Consumes: `PageHeader` layout conventions from Task 3 (visually only)
- Produces: nothing consumed downstream

- [ ] **Step 1: Create the loading skeleton**

Create `src/app/(dashboard)/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the error boundary**

Create `src/app/(dashboard)/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              This page could not be loaded. Try again, and if it keeps failing
              check the server logs.
            </p>
          </div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

The raw `error.message` is deliberately not rendered — it can leak stack details and database
internals to the browser. It is logged to the console instead.

- [ ] **Step 3: Create the not-found page**

Create `src/app/(dashboard)/not-found.tsx`:

```tsx
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <SearchX aria-hidden className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Not found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              That record does not exist, or it belongs to another household.
            </p>
          </div>
          <Button render={<Link href="/" />}>Back to Home</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

`Button` in this shadcn style is a base-ui primitive that accepts the `render` prop (used the same way
in `entity-create-dialog.tsx`).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run build` → PASS.

With `npm run dev`:
1. Navigate between `/`, `/life`, `/deadlines` → a skeleton appears before content (use DevTools
   network throttling to make it observable).
2. Visit `/life/asset/00000000-0000-0000-0000-000000000000` → the not-found card renders, "Back to
   Home" works.
3. Confirm the error boundary compiles into the build; provoking a real server error is not required.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/loading.tsx" "src/app/(dashboard)/error.tsx" "src/app/(dashboard)/not-found.tsx"
git commit -F - <<'EOF'
Redesign step 6: add route-level loading, error, and not-found states

Every dashboard page awaits the database with no fallback, so navigation
appeared frozen. Adds a skeleton, an error boundary with retry, and a 404 card.

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 7: Page sweep — PageHeader everywhere, delete EntityTabs, unclip entities

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/app/(dashboard)/life/page.tsx`
- Modify: `src/app/(dashboard)/deadlines/page.tsx`
- Modify: `src/app/(dashboard)/tasks/page.tsx`
- Modify: `src/app/(dashboard)/ai/page.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/life/[type]/[id]/page.tsx`
- Delete: `src/components/entities/entity-tabs.tsx`

**Interfaces:**
- Consumes: `PageHeader` from Task 3
- Produces: nothing consumed downstream

- [ ] **Step 1: Delete the inert tabs component**

Delete the file `src/components/entities/entity-tabs.tsx`.

It rendered a `TabsList` of 13 triggers with no `TabsContent` anywhere, so clicking a tab changed
nothing. `life/page.tsx` already groups every entity by type with a count, which is what the tabs
pretended to offer.

- [ ] **Step 2: Unclip entities and drop the tabs from `life/page.tsx`**

Remove the import:

```tsx
import { EntityTabs } from "@/components/entities/entity-tabs";
```

Remove the render:

```tsx
      <EntityTabs />

```

Change the grid slice so every entity is reachable:

```tsx
              <EntityList entities={items.slice(0, 5)} />
```

becomes:

```tsx
              <EntityList entities={items} />
```

This is the fix for the second half of D6: with the tabs gone and the slice in place, entities 6+
of each type had no route to them at all.

- [ ] **Step 3: Give each entity group a count that means something**

Replace the group heading block in `life/page.tsx`:

```tsx
              <div className="flex items-center gap-2">
                {config && <config.icon aria-hidden className="h-4 w-4 text-muted-foreground" />}
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm text-muted-foreground">
                  ({items.length})
                </span>
              </div>
```

with:

```tsx
              <div className="flex items-center gap-2">
                {config && <config.icon aria-hidden className="h-4 w-4 text-muted-foreground" />}
                <h2 className="font-semibold">{config?.label || type}</h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
```

(If Task 2 already applied this, skip — but keep `tabular-nums`.)

- [ ] **Step 4: Convert `life/page.tsx` header and empty state**

Replace:

```tsx
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Life Admin Graph</h1>
          <p className="text-muted-foreground">
            Browse and manage all your life admin entities and their relationships.
          </p>
        </div>
        <EntityCreateDialog />
      </div>
```

with:

```tsx
      <PageHeader
        title="Life Admin Graph"
        description="Browse and manage all your life admin entities and their relationships."
        action={<EntityCreateDialog />}
      />
```

Replace the trailing empty block:

```tsx
      {allEntities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No entities yet. Upload documents to your Inbox to start building
            your Life Admin Graph.
          </p>
        </div>
      )}
```

with:

```tsx
      {allEntities.length === 0 && (
        <EmptyState
          icon={Network}
          title="No entities yet"
          description="Upload documents to your Inbox to start building your Life Admin Graph."
          action={<Button render={<Link href="/inbox" />}>Go to Inbox</Button>}
        />
      )}
```

Add imports:

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Network } from "lucide-react";
```

- [ ] **Step 5: Convert `tasks/page.tsx`**

Replace:

```tsx
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and workflows.
          </p>
        </div>
        <TaskCreateDialog />
      </div>
```

with:

```tsx
      <PageHeader
        title="Tasks"
        description="Manage your tasks and workflows."
        action={<TaskCreateDialog />}
      />
```

Add the import.

- [ ] **Step 6: Convert `deadlines/page.tsx`**

Replace:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deadlines</h1>
        <p className="text-muted-foreground">
          Every date that matters, with what happens if you do nothing.
        </p>
      </div>
```

with:

```tsx
      <PageHeader
        title="Deadlines"
        description="Every date that matters, with what happens if you do nothing."
      />
```

Add the import.

- [ ] **Step 7: Convert `ai/page.tsx`**

Replace:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about your life admin, get recommendations, and take
          action.
        </p>
      </div>
```

with:

```tsx
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your life admin, get recommendations, and take action."
      />
```

Add the import.

- [ ] **Step 8: Convert `settings/page.tsx` header**

Replace:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, household, and preferences.
        </p>
      </div>
```

with:

```tsx
      <PageHeader
        title="Settings"
        description="Manage your account, household, and preferences."
      />
```

Add the import.

- [ ] **Step 9: Convert `(dashboard)/page.tsx`**

Replace:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Good {getGreeting()}, {session.user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>
```

with:

```tsx
      <PageHeader
        title={`Good ${getGreeting()}, ${session.user.name?.split(" ")[0] || "there"}`}
        description="Here's what needs your attention today."
      />
```

Add the import.

Also replace the household-missing fallback in the same file:

```tsx
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome to Life Admin OS</h1>
        <p className="text-muted-foreground">
          Setting up your household...
        </p>
      </div>
```

with:

```tsx
      <div className="space-y-6">
        <PageHeader title="Welcome to Life Admin OS" description="Setting up your household…" />
      </div>
```

- [ ] **Step 10: Fix the duplicate `h1` on the entity detail page**

In `src/app/(dashboard)/life/[type]/[id]/page.tsx`, replace:

```tsx
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
              <Badge variant="secondary">{config?.label}</Badge>
              {entity.archivedAt && <Badge variant="outline">Archived</Badge>}
            </div>
```

with:

```tsx
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{entity.name}</h1>
              <Badge variant="secondary">{config?.label}</Badge>
              {entity.archivedAt && <Badge variant="outline">Archived</Badge>}
            </div>
```

This page keeps its own `<h1>` (its title is dynamic per record, and `PageHeader` would fight the
icon + badge row), but the size is aligned to the `PageHeader` scale so the two do not look
inconsistent. Only `PageHeader`'s `<h1>` and this one exist — never two on one page.

- [ ] **Step 11: Verify one `h1` per page and no dead tabs**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run lint` → PASS.

Search for leftovers — must return no results:

```
grep -rn "entity-tabs\|EntityTabs" src/
```

Then with `npm run dev`, visit `/`, `/inbox`, `/life`, `/deadlines`, `/tasks`, `/ai`, `/settings` and
each page's DevTools console:
1. `document.querySelectorAll('h1').length` === 1 on every route.
2. `/life` lists every entity of each type, not just the first five.
3. Both themes still look correct on each page.

- [ ] **Step 12: Commit**

```bash
git add src/components/entities/entity-tabs.tsx "src/app/(dashboard)/page.tsx" "src/app/(dashboard)/life/page.tsx" "src/app/(dashboard)/deadlines/page.tsx" "src/app/(dashboard)/tasks/page.tsx" "src/app/(dashboard)/ai/page.tsx" "src/app/(dashboard)/settings/page.tsx" "src/app/(dashboard)/life/[type]/[id]/page.tsx"
git commit -F - <<'EOF'
Redesign step 7: unify page headers, remove inert tabs, unclip entities

- All dashboard pages use PageHeader, giving each route exactly one h1
- Delete entity-tabs.tsx: it rendered a TabsList with no TabsContent, so
  every tab was a no-op
- Drop items.slice(0,5) so entities beyond the fifth are reachable at all

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 8: Colour and interaction sweep across domain components

**Files:**
- Modify: `src/components/home/score-card.tsx`
- Modify: `src/components/home/priority-actions.tsx`
- Modify: `src/components/home/upcoming-deadlines.tsx`
- Modify: `src/components/home/quick-stats.tsx`
- Modify: `src/components/deadlines/deadline-list.tsx`
- Modify: `src/components/ai/ai-chat.tsx`
- Modify: `src/components/entities/entity-list.tsx`
- Modify: `src/components/entities/entity-actions.tsx`
- Modify: `src/components/entities/entity-relations-manager.tsx`
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/app/(dashboard)/deadlines/page.tsx`
- Modify: `src/app/(dashboard)/life/[type]/[id]/page.tsx`

`entity-create-dialog.tsx`, `entity-attributes-editor.tsx`, and `task-create-dialog.tsx` contain no
hardcoded colours and no unlabelled icon-only controls, so they are deliberately left alone.

**Interfaces:**
- Consumes: `StatusBadge`, `urgencyTone`, `priorityTone`, `documentTone`, `taskStatusTone` from Task 3; `daysUntil`, `startOfToday` from Task 4
- Produces: `DeadlineItem` in `deadline-list.tsx` gains a required `days: number` field, and `UpcomingDeadlines` / `PriorityActions` reminder props gain `days: number` — their server parents must supply it

This task is mostly mechanical. The colour mapping below is exact — apply it literally.

**Hardcoded colour → token mapping:**

| Find | Replace with |
|------|-------------|
| `border-green-200 bg-green-50` | `border-success-muted bg-success-muted` |
| `text-green-800`, `text-green-600` | `text-success-muted-foreground` |
| `text-green-500` | `text-success` |
| `bg-green-100`, `bg-green-500` | `bg-success-muted`, `bg-success` |
| `border-orange-200 bg-orange-50`, `border-orange-300 bg-orange-50` | `border-warning-muted bg-warning-muted` |
| `text-orange-800`, `text-orange-700`, `text-orange-600`, `text-orange-500` | `text-warning-muted-foreground` |
| `border-yellow-300 bg-yellow-50`, `border-yellow-400 bg-yellow-50` | `border-warning-muted bg-warning-muted` |
| `text-yellow-500`, `text-yellow-600` | `text-warning-muted-foreground` |
| `bg-yellow-500` | `bg-warning` |
| `text-red-500`, `bg-red-500` | `text-destructive`, `bg-destructive` |
| `bg-orange-500`, `bg-gray-500` | `bg-warning`, `bg-muted-foreground` |
| `bg-white/60` | `bg-background/60` |

`bg-white/60` is the urgent fix: on a dark card it painted a white slab.

- [ ] **Step 1: Fix `score-card.tsx`**

Replace `getScoreColor` and `getScoreLabel` with a single tone lookup:

```tsx
function scoreTone(score: number) {
  if (score >= 80) return { label: "Excellent", tone: "success" as const };
  if (score >= 60) return { label: "Good", tone: "info" as const };
  if (score >= 40) return { label: "Needs Attention", tone: "warning" as const };
  return { label: "Critical", tone: "danger" as const };
}
```

Replace the body of the `<CardContent>`:

```tsx
      <CardContent>
        {(() => {
          const { label, tone } = scoreTone(score);
          return (
            <>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold tabular-nums">{score}</span>
                <span className="text-xl text-muted-foreground">/100</span>
              </div>
              <Progress
                value={score}
                className="mt-3"
                aria-label={`Life admin health score: ${score} out of 100`}
              />
              <div className="mt-3">
                <StatusBadge tone={tone}>{label}</StatusBadge>
              </div>
            </>
          );
        })()}
      </CardContent>
```

The score number loses its red/yellow/green colouring and the status moves into a badge. A five-xl
number painted `text-red-500` is an anxiety signal with no action attached; the word plus a muted
pill says the same thing without shouting. `tabular-nums` stops the digits jittering as the score
changes.

Add the import:

```tsx
import { StatusBadge } from "@/components/status-badge";
```

- [ ] **Step 2: Fix `priority-actions.tsx`**

Replace the all-clear branch:

```tsx
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <AlertCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">All clear!</p>
              <p className="text-sm text-green-600">
                No urgent items need your attention right now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
```

with:

```tsx
      <Card className="border-success-muted bg-success-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60">
              <CircleCheck aria-hidden className="h-5 w-5 text-success-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-success-muted-foreground">All clear</p>
              <p className="text-sm text-success-muted-foreground">
                No urgent items need your attention right now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
```

Replace the attention branch's `Card` className and header:

```tsx
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-orange-800">
          <AlertTriangle className="h-4 w-4" />
          Requires Attention
        </CardTitle>
        <CardDescription className="text-orange-600">
          {urgentTasks.length + urgentReminders.length} item(s) need action
        </CardDescription>
      </CardHeader>
```

with:

```tsx
    <Card className="border-warning-muted bg-warning-muted">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-warning-muted-foreground">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          Requires attention
        </CardTitle>
        <CardDescription className="text-warning-muted-foreground">
          {urgentTasks.length + urgentReminders.length} item(s) need action
        </CardDescription>
      </CardHeader>
```

Then replace both row bodies' `bg-white/60` with `bg-background/60`, replace each `Badge` with a
`StatusBadge`, and make the remainder of the file read `days` from props instead of calling
`Date.now()`. The reminder row becomes:

```tsx
        {urgentReminders.slice(0, 2).map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between rounded bg-background/60 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Clock aria-hidden className="h-4 w-4 shrink-0 text-warning-muted-foreground" />
              <span className="truncate text-sm">{reminder.title}</span>
            </div>
            <StatusBadge tone={urgencyTone(reminder.days)}>
              {reminder.days} day{reminder.days !== 1 ? "s" : ""}
            </StatusBadge>
          </div>
        ))}
```

The task row becomes:

```tsx
        {urgentTasks.slice(0, 2).map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded bg-background/60 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-warning-muted-foreground" />
              <span className="truncate text-sm">{task.title}</span>
            </div>
            <StatusBadge tone={priorityTone(task.priority)}>
              <span className="capitalize">{task.priority}</span>
            </StatusBadge>
          </div>
        ))}
```

Update the props and filtering at the top of the file:

```tsx
interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: Date;
  days: number;
}
```

and replace the `urgentReminders` filter body:

```tsx
  const urgentReminders = reminders.filter((r) => r.days <= 7);
```

Replace the link at the bottom:

```tsx
        <Link
          href="/tasks"
          className="block pt-1 text-center text-sm font-medium text-orange-700 hover:underline"
        >
          View all tasks
        </Link>
```

with:

```tsx
        <Link
          href="/tasks"
          className="block pt-1 text-center text-sm font-medium text-warning-muted-foreground hover:underline"
        >
          View all tasks
        </Link>
```

Update imports: add `CircleCheck` to the `lucide-react` import; add

```tsx
import { StatusBadge, urgencyTone, priorityTone } from "@/components/status-badge";
```

- [ ] **Step 3: Fix `upcoming-deadlines.tsx`**

Add `days: number` to the `Reminder` interface, delete the local `daysUntil`-equivalent computation,
and replace the row's `Badge` with:

```tsx
                  <StatusBadge tone={urgencyTone(reminder.days)}>
                    {reminder.days} day{reminder.days !== 1 ? "s" : ""}
                  </StatusBadge>
```

Replace the empty branch:

```tsx
          <p className="text-center text-muted-foreground py-6">
            No upcoming deadlines. Upload documents to track warranties, subscriptions, and more.
          </p>
```

with:

```tsx
          <EmptyState
            icon={Calendar}
            title="No upcoming deadlines"
            description="Upload documents to track warranties, subscriptions, and more."
          />
```

Add imports (`EmptyState`, `StatusBadge` + `urgencyTone`) and add `aria-hidden` to the `Calendar`
and `ChevronRight` icons.

- [ ] **Step 4: Fix `quick-stats.tsx`**

Add `tabular-nums` to each stat value:

```tsx
          <div className="text-2xl font-bold tabular-nums">{subscriptionsCount}</div>
```

…and the same for `warrantiesCount`, `upcomingCount`, `tasksCount`. Add `aria-hidden` to each of the
four header icons.

- [ ] **Step 5: Fix `deadline-list.tsx`**

This is the largest single edit in the task. Change the `DeadlineItem` interface to require `days`:

```tsx
interface DeadlineItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerAt: string;
  status: string;
  days: number;
  entityId: string | null;
  entityType: string | null;
  entityName: string | null;
}
```

Delete the local `daysUntil` function and the `DAY_MS` constant, and remove `daysUntil` from every
call site in favour of `item.days`.

Replace the `Group` interface's `className` values in the `groups` memo:

```tsx
        className: "border-destructive/40 bg-destructive/5",
```
stays as-is;
```tsx
        className: "border-orange-300 bg-orange-50",
```
becomes
```tsx
        className: "border-warning-muted bg-warning-muted",
```
and
```tsx
        className: "border-yellow-300 bg-yellow-50",
```
becomes
```tsx
        className: "border-info-muted bg-info-muted",
```

Change the bucketing to use the tested helper instead of raw comparisons:

```tsx
    for (const r of reminders) {
      if (r.status === "dismissed") {
        dismissed.push(r);
        continue;
      }

      switch (urgencyOf(r.days)) {
        case "overdue":
          overdue.push(r);
          break;
        case "today":
        case "soon":
          week.push(r);
          break;
        default:
          if (r.days <= 30) month.push(r);
          else later.push(r);
      }
    }
```

Add `urgencyOf` to the `@/lib/deadline-urgency` import. This is why `urgencyOf` exists and is tested —
without this wiring it would be dead code.

Change `createTask`'s priority line to use the field:

```tsx
          priority: item.days <= 7 ? "high" : "medium",
```

Replace the row's day badge:

```tsx
                            {item.status === "dismissed" ? (
                              <Badge variant="outline">dismissed</Badge>
                            ) : (
                              <Badge
                                variant={
                                  d < 0
                                    ? "destructive"
                                    : d <= 7
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {d < 0
                                  ? `${Math.abs(d)}d overdue`
                                  : d === 0
                                    ? "today"
                                    : `${d}d`}
                              </Badge>
                            )}
```

with:

```tsx
                            {item.status === "dismissed" ? (
                              <StatusBadge tone="neutral">Dismissed</StatusBadge>
                            ) : (
                              <StatusBadge tone={urgencyTone(item.days)}>
                                {item.days < 0
                                  ? `${Math.abs(item.days)}d overdue`
                                  : item.days === 0
                                    ? "today"
                                    : `${item.days}d`}
                              </StatusBadge>
                            )}
```

Replace the confirm-note line's `d` reference:

```tsx
                          <p className="mt-1 text-sm text-muted-foreground">
                            {new Date(item.triggerAt).toLocaleDateString("en-US", {
```

stays, but the `Info` icon inside the message box gets `aria-hidden`:

```tsx
                              <Info aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
```

Add `aria-label="More actions"` to the dropdown trigger:

```tsx
                                <DropdownMenuTrigger
                                  render={<Button variant="ghost" size="icon" aria-label="More actions" />}
                                >
```

Replace the error banner to have it announced by assistive tech:

```tsx
        <div className="rounded border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
```

becomes

```tsx
        <div
          role="alert"
          className="rounded border border-destructive bg-destructive/5 p-3 text-sm text-destructive"
        >
```

Only `role="alert"` is added. There is no `--destructive-muted` token in spec §3.3/§3.4 — do not
invent one.

Replace the empty branch:

```tsx
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No deadlines yet. Upload documents to your Inbox to start tracking
            warranties, contracts, and renewals.
          </CardContent>
        </Card>
```

with:

```tsx
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              title="No deadlines yet"
              description="Upload documents to your Inbox to start tracking warranties, contracts, and renewals."
              action={<Button render={<Link href="/inbox" />}>Go to Inbox</Button>}
            />
          </CardContent>
        </Card>
```

Add imports (`EmptyState`, `StatusBadge` + `urgencyTone`), and drop `Badge` from the `@/components/ui/badge`
import if it is no longer referenced in the file.

- [ ] **Step 6: Fix the remaining entity components**

**`entity-list.tsx`** — replace the empty branch:

```tsx
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No entities of this type
        </CardContent>
      </Card>
```

with:

```tsx
      <Card>
        <CardContent>
          <EmptyState title="No entities of this type" />
        </CardContent>
      </Card>
```

Add the import:

```tsx
import { EmptyState } from "@/components/layout/empty-state";
```

**`entity-actions.tsx`** — the icon-only trigger has no accessible name. Change:

```tsx
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
```

to:

```tsx
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" aria-label="Item actions" />}
        >
```

**`entity-relations-manager.tsx`** — replace the bare empty paragraph:

```tsx
      {!hasAny && (
        <p className="text-sm text-muted-foreground">
          No relationships yet. Link this item to related records.
        </p>
      )}
```

with:

```tsx
      {!hasAny && (
        <EmptyState
          title="No relationships yet"
          description="Link this item to related records."
        />
      )}
```

Add the `EmptyState` import. Both remove-relation buttons already carry
`aria-label="Remove relation"` — leave them alone.

- [ ] **Step 7: Fix `ai-chat.tsx`**

Three concrete changes:

**(a) Auto-scroll is currently dead.** `ScrollArea` is a base-ui component whose `ref` points at the
root wrapper, which has `overflow-hidden`; the element that actually scrolls is an inner viewport, so
`scrollRef.current.scrollTop = …` has never done anything. Replace the `ScrollArea` element:

```tsx
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
```

with a plain scroll container:

```tsx
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain pr-4">
          <div className="space-y-4">
```

and close it with `</div>` where `</ScrollArea>` was. Remove the now-unused
`import { ScrollArea } from "@/components/ui/scroll-area";`.

**(b) The submit button has no accessible name** (it is icon-only). Change:

```tsx
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
```

to:

```tsx
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
```

**(c) The loading bubble is invisible to assistive tech.** Change:

```tsx
                <div className="rounded-lg px-3 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
```

to:

```tsx
                <div className="rounded-lg bg-muted px-3 py-2">
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  <span className="sr-only">Thinking…</span>
                </div>
```

Also add `aria-label="Message"` to the chat `Input` — it currently relies on `placeholder` alone,
which is not a label.

- [ ] **Step 8: Update the server parents that feed `days`**

`days` is now required, so the server components that build these props must compute it:

In `src/app/(dashboard)/page.tsx`, import the helper:

```tsx
import { daysUntil, startOfToday } from "@/lib/deadline-urgency";
```

and build the values once, before returning JSX:

```tsx
  const today = startOfToday();
  const remindersWithDays = upcomingReminders.map((r) => ({
    ...r,
    days: daysUntil(r.triggerAt, today),
  }));
```

Then pass `reminders={remindersWithDays}` to both `<PriorityActions />` and `<UpcomingDeadlines />`.

In `src/app/(dashboard)/deadlines/page.tsx`, inside the existing `serialized` map, add:

```tsx
    days: daysUntil(r.triggerAt, startOfToday()),
```

and add the import. Compute `const today = startOfToday();` once outside the map and use
`daysUntil(r.triggerAt, today)` — do not call `startOfToday()` per row.

In `src/app/(dashboard)/life/[type]/[id]/page.tsx`, replace the inline `Date.now()` computation in the
reminders card:

```tsx
                    const days = Math.ceil(
                      (new Date(r.triggerAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
```

with:

```tsx
                    const days = daysUntil(r.triggerAt, today);
```

and add `const today = startOfToday();` near the top of the component body, plus the import.

- [ ] **Step 9: Verify no hardcoded palette colours remain**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run lint` → PASS.
Run: `npm test` → PASS (Task 4's tests still green).

Search (grep tool, not shell) for hardcoded palette classes in the domain layer — must return no results:

```
pattern: "(bg|text|border)-(green|orange|yellow|red|blue|purple|pink|teal|cyan|indigo|slate|gray)-[0-9]"
glob: "src/components/**/*.tsx"
```

If matches remain only inside `src/components/ui/*`, that is expected and correct — those are vendored
shadcn primitives and are out of scope.

- [ ] **Step 10: Verify hydration no longer warns**

With `npm run dev`, open `/`, `/deadlines`, and a `/life/...` detail page with the DevTools console
open, then hard-reload each.
Expected: no "Hydration failed" / "Text content does not match server-rendered HTML" warnings. Before
this task, the four `Date.now()`-in-render sites produced them whenever the client and server
evaluated at different day boundaries.

- [ ] **Step 11: Commit**

```bash
git add src/components/home/score-card.tsx src/components/home/priority-actions.tsx src/components/home/upcoming-deadlines.tsx src/components/home/quick-stats.tsx src/components/deadlines/deadline-list.tsx src/components/ai/ai-chat.tsx src/components/entities/entity-list.tsx src/components/entities/entity-actions.tsx src/components/entities/entity-relations-manager.tsx "src/app/(dashboard)/page.tsx" "src/app/(dashboard)/deadlines/page.tsx" "src/app/(dashboard)/life/[type]/[id]/page.tsx"
git commit -F - <<'EOF'
Redesign step 8: sweep domain components onto semantic colour tokens

Replaces hardcoded palette classes with success/warning/info tokens so both
themes work; bg-white/60 on a dark card was the worst offender. Status colour
now flows through StatusBadge only, so colour is never the sole indicator.

Day counts are computed once on the server from the shared tested helper
instead of Date.now() during render, removing the hydration mismatch risk.

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Task 9: Auth form and settings fixes

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/auth/register-form.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` from Task 3; `EmptyState` is not needed here
- Produces: nothing consumed downstream

- [ ] **Step 1: Add `autoComplete` to the login form**

In `src/components/auth/login-form.tsx`, add to the email `Input`:

```tsx
              autoComplete="email"
```

and to the password `Input`:

```tsx
              autoComplete="current-password"
```

Also give the error paragraph a role so it is announced:

```tsx
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
```

- [ ] **Step 2: Add `autoComplete` to the register form**

In `src/components/auth/register-form.tsx`, add:

- name `Input` → `autoComplete="name"`
- email `Input` → `autoComplete="email"`
- password `Input` → `autoComplete="new-password"`

and the same `role="alert"` on the error paragraph.

- [ ] **Step 3: Surface the registration success message**

In `src/app/(auth)/login/page.tsx`, change the signature to accept search params:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  const { registered } = await searchParams;
```

Then render, between the intro block and `<LoginForm />`:

```tsx
        {registered === "true" && (
          <p
            role="status"
            className="rounded-lg bg-success-muted px-4 py-3 text-sm text-success-muted-foreground"
          >
            Account created. Sign in to continue.
          </p>
        )}
```

`register-form.tsx` already redirects to `/login?registered=true`; nothing read it, so a new user got
no confirmation that anything had happened.

Finally in this step, fix the auth page shell on **both** pages. `(auth)/login/page.tsx` and
`(auth)/register/page.tsx` both wrap their content in:

```tsx
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
```

Change both to:

```tsx
    <div className="flex min-h-dvh items-center justify-center bg-muted/10 p-4">
```

Same defect as the dashboard layout (`100vh` overshoots the mobile viewport once browser chrome is
counted). Also bring the heading down to match the new `PageHeader` scale — in
`(auth)/register/page.tsx`, change:

```tsx
          <h1 className="text-3xl font-bold tracking-tight">Life Admin OS</h1>
```

to:

```tsx
          <h1 className="text-2xl font-semibold tracking-tight">Life Admin OS</h1>
```

and make the identical change in `(auth)/login/page.tsx` so the two auth screens match.

- [ ] **Step 4: Fix the Settings checkboxes and the fake save**

In `src/app/(dashboard)/settings/page.tsx`, replace each of the four raw
`<input type="checkbox" … className="h-4 w-4" />` elements with a labelled `Checkbox`. The pattern
for each row is (shown for the first one; apply the same shape to all four with unique ids):

```tsx
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-create">Auto-create records</Label>
                <p className="text-sm text-muted-foreground">
                  Allow AI to create entities from documents
                </p>
              </div>
              <Checkbox id="auto-create" defaultChecked disabled />
            </div>
```

The four ids and their default states:

| id | Label | defaultChecked |
|----|-------|----------------|
| `auto-create` | Auto-create records | yes |
| `proactive-reminders` | Proactive reminders | yes |
| `external-actions` | External actions | no |
| `weekly-brief` | Weekly Life Brief | yes |
| `deadline-alerts` | Deadline alerts | yes |

All five are `disabled`, because nothing persists them (documented tech debt in
`docs/DEVELOPMENT.md` §7). A disabled control that is visibly disabled is honest; an enabled
checkbox that silently discards the click is not.

Replace the Household section's save button and add a note:

```tsx
          <Button>Save Changes</Button>
```

becomes:

```tsx
          <div className="flex items-center gap-3">
            <Button disabled>Save Changes</Button>
            <p className="text-sm text-muted-foreground">
              Not wired up yet — household editing is planned for a later phase.
            </p>
          </div>
```

Add imports:

```tsx
import { Checkbox } from "@/components/ui/checkbox";
```

`Label` is already imported.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run lint` → PASS.
Run: `npm run build` → PASS.

With `npm run dev`:
1. `/register` → create an account → land on `/login` → the green success message is visible.
2. Inspect the login email/password inputs → `autocomplete="email"` and
   `autocomplete="current-password"` are present in the DOM.
3. `/settings` → every checkbox is visibly disabled; clicking one does nothing; the Save Changes
   button is disabled with an explanatory note next to it.
4. Tab through `/settings` → checkboxes are not focusable (disabled), Save is skipped, no focus traps.
5. Check the success message and the disabled states in **both** themes.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/login-form.tsx src/components/auth/register-form.tsx "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx" "src/app/(dashboard)/settings/page.tsx"
git commit -F - <<'EOF'
Redesign step 9: fix auth form a11y and the fake settings controls

- Add autoComplete so password managers work on both auth forms
- Surface the ?registered=true confirmation that was being discarded
- Replace unlabelled raw checkboxes with disabled Checkbox + Label
- Disable the Settings save button and say why

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Final Verification

Run every gate:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Then the checks that no automated gate can make:

- [ ] **Font:** DevTools Computed `font-family` on `<body>` contains `Geist` (Task 1, Step 7).
- [ ] **Dark mode:** measured contrast passes in both themes (Task 1, Step 9). The spec §3.5 table is an estimate only.
- [ ] **No emoji:** the emoji search from Task 2 Step 10 returns nothing.
- [ ] **Mobile:** at 375px, all 7 destinations reachable; content clear of the bottom bar (Task 5, Step 6).
- [ ] **One `h1` per route** across all 7 dashboard routes (Task 7, Step 11).
- [ ] **No hydration warnings** on `/`, `/deadlines`, `/life/[type]/[id]` (Task 8, Step 10).
- [ ] **No hardcoded palette classes** outside `src/components/ui/**` (Task 8, Step 9).
- [ ] **Keyboard:** focus visible on every interactive element in both themes; no focus trapped behind the mobile sheet or dialogs.
- [ ] **Reduced motion:** with `prefers-reduced-motion: reduce` emulated, nothing breaks (the only motion is `animate-spin` on loaders and `transition-all` on buttons, both safe).

---

## Notes for the executor

- **Task order matters.** Task 1 must land first (everything reads those tokens). Task 2 and Task 4 are independent of each other. Tasks 3, 5, 6, 7, 8, 9 depend on 1; 7 and 8 depend on 3; 8 depends on 4.
- **`src/components/ui/*` is off limits.** If a fix seems to need a change there, the fix belongs at the call site instead. The one place this bites is card headings — see spec §9.1, which documents why that is accepted rather than worked around.
- **Do not "improve" beyond these tasks.** No command palette, no search, no IA changes, no pagination. Those were explicitly scoped out (spec §2, §9.2).
- If `tsc` reports an error in a file not listed in a task's Files block, the task's file list is incomplete — add the file rather than casting or suppressing.

---

## Execution log — deviations from this plan

Recorded after the plan was executed on 2026-09-12. The plan above is kept as written; these are
the points where execution had to differ, and why.

1. **`entity-tabs.tsx` was deleted in Task 2, not Task 7.** Changing `ENTITY_TYPE_CONFIG.icon` to
   `LucideIcon` breaks `entity-tabs.tsx` like every other call site, so Task 2's `tsc` gate could
   not pass while the file still existed. Task 7 Step 1 was therefore already done.
2. **`ThemeToggle` does not use `useState` + `useEffect`.** Plan Step 5 for Task 1 was rejected by
   the linter (`react-hooks/set-state-in-effect`: cascading renders). It is implemented with
   `useSyncExternalStore` plus a custom event instead — the correct way to read state that lives
   outside React, and still hydration-safe via `getServerSnapshot`.
3. **Three pre-existing lint errors were not covered by any task**, so Task 8's "`npm run lint` →
   PASS" gate was unachievable as written. Fixed in Task 8:
   - `entity-relations-manager.tsx` — `setState` synchronously in an effect; the fetch moved into a
     cancellable async function inside the effect.
   - `inbox-items.tsx` — `fetchDocuments` called before its declaration; the fetch is inlined into
     the effect with cancellation.
   - `inbox-upload.tsx` — `handleFileUpload` referenced before its declaration; the four
     `useCallback` wrappers were removed entirely rather than reordered, since memoising those
     handlers bought nothing.
4. **`--input` changed in both themes.** The plan's Task 1 Step 9 required contrast to be measured
   and failing pairs fixed. Text pairs all passed, but the *form-control boundary* did not: the old
   `--input` measured 1.27:1 (light) and 1.50:1 (dark) against `--card`, below WCAG 1.4.11's 3:1.
   Now `oklch(0.665 0 0)` light and `oklch(1 0 0 / 34%)` dark, measuring 3.05:1 and 3.11:1.
   `--border` is deliberately left faint: it is a decorative divider, which has no WCAG floor.
5. **Commit steps were not run.** The working tree already contained unrelated uncommitted work in
   `deadline-list.tsx`, `deadlines/page.tsx`, and `life/[type]/[id]/page.tsx`, which these tasks also
   modify. Separating those hunks without an interactive `git add -p` was not possible, so committing
   would have folded unreviewed work into the redesign history.

**Final gate results:** `npx tsc --noEmit` clean · `npm run lint` 0 errors (41 warnings, all
pre-existing unused-symbol warnings) · `npm test` 8/8 · `npm run build` compiled, 20/20 pages.
