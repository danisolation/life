# Money App Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây lại repo `E:\Study\life` thành app quản lý tiền cá nhân single-user: nhập thu/chi, phân loại, budget theo category, và trang đánh giá hàng tháng có insight.

**Architecture:** Next.js 16 App Router, server-first. Trang là async server component query Drizzle rồi truyền plain object xuống client component; mutation đi qua REST API rồi `router.refresh()`. Auth tự viết: bcrypt + cookie HttpOnly ký HMAC. Toàn bộ logic tiền là pure function trong `src/lib/money/`, có test bằng `node:test`.

**Tech Stack:** Next.js 16.3.4 · React 19.2.8 · TypeScript strict · Tailwind CSS v4 · shadcn/ui (base UI) · Drizzle ORM 0.45 + `pg` · PostgreSQL 17 · bcryptjs · `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-14-money-app-design.md`

## Global Constraints

- Node 22+, npm. DB: container `life-admin-postgres`, `DATABASE_URL=postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os`.
- `.npmrc` giữ `omit=optional`; các optional dep pin cho Linux (`@next/swc-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`, `lightningcss-linux-x64-gnu`) và `scripts/fix-native-bindings.sh` phải giữ nguyên — đó là workaround bắt buộc trên môi trường này.
- **Không thêm dependency mới.** Đã có đủ: `Intl` cho format tiền/ngày, `node:test` cho test, `node:crypto` cho HMAC.
- Path alias `@/*` → `./src/*`. `tsconfig.json` giữ `allowImportingTsExtensions` (test import file `.ts`).
- **Next 16**: `cookies()`, `headers()`, `params`, `searchParams` đều là Promise → phải `await`. Trước khi viết code App Router, đọc guide trong `node_modules/next/dist/docs/`.
- UI strings **tiếng Anh**. Docs và trao đổi tiếng Việt.
- Test chạy bằng `npm test` → `node --experimental-strip-types --test "src/**/*.test.ts"`. Test colocate cạnh source, import bằng đuôi `.ts`.
- Mọi bảng đều có `userId` và **mọi query phải scope theo `userId` từ session**; không bao giờ nhận `userId` từ client.
- Tiền lưu **integer minor units**; `VND/JPY/KRW/IDR/CLP/ISK` = 0 chữ số thập phân, còn lại ×100.
- Commit message theo conventional commits, kết thúc bằng trailer:
  `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>`
- Không commit `.commandcode/`, `.env.local`, `uploads/`.

---

## File Structure

| File | Trách nhiệm |
| --- | --- |
| `src/lib/db/schema.ts` | Nguồn sự thật của DB: 4 bảng + enum `category_kind` |
| `src/lib/db/index.ts` | Drizzle client (Pool + schema) |
| `src/lib/db/default-categories.ts` | Bộ category mặc định, dùng chung cho register và seed |
| `src/lib/session-token.ts` | Ký/verify token (thuần crypto, testable, không import Next) |
| `src/lib/session.ts` | Cookie + `getCurrentUser()` + `requireUser()` |
| `src/lib/auth.ts` | `hashPassword` / `verifyPassword` |
| `src/lib/validate.ts` | Regex + helper validate input biên |
| `src/lib/format.ts` | `formatDate`, `formatMonthLabel` dùng `Intl` |
| `src/lib/money/amount.ts` | `minorUnitDigits`, `parseAmount`, `formatMoney`, `formatCompactMoney` |
| `src/lib/money/period.ts` | `monthKey`, `monthRange`, `shiftMonth`, `daysInMonth`, `daysElapsed`, `todayKey` |
| `src/lib/money/summary.ts` | Kiểu `MonthSummary` + `summarize` |
| `src/lib/money/compare.ts` | `compareMonths` + movers |
| `src/lib/money/budget.ts` | `budgetStatus`, `budgetLines` |
| `src/lib/money/insights.ts` | `buildInsights` + 8 rule |
| `src/app/api/**/route.ts` | Chỉ mutation + auth |
| `src/app/(auth)/**` | login, register |
| `src/app/(app)/**` | layout có guard + 5 trang |
| `src/components/money/**` | Component của module tiền |
| `src/components/layout/**` | app shell, nav, page-header, empty-state, theme-toggle |
| `scripts/seed-demo.ts` | Seed user demo + 6 tháng dữ liệu |
| `docs/*.md` | Tài liệu viết lại |

---

### Task 1: Reset repo, scaffold, schema + auth

**Files:**
- Delete: toàn bộ code life-admin (danh sách ở Step 1)
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/default-categories.ts`
- Create: `src/lib/session-token.ts`, `src/lib/session.test.ts` (test cho token), `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/validate.ts`
- Create: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`
- Create: `src/app/(app)/layout.tsx`, `src/components/layout/app-shell.tsx`, `src/components/layout/app-nav.tsx`
- Modify: `package.json`, `.env.example`, `.gitignore`, `.env.local`, `src/app/layout.tsx`
- Keep as-is: `next.config.ts`, `tsconfig.json`, `postcss.config.js`, `eslint.config.mjs`, `components.json`, `.npmrc`, `drizzle.config.ts`, `scripts/fix-native-bindings.sh`, `src/app/globals.css`, `src/lib/utils.ts`, `src/components/ui/*` (bỏ `calendar.tsx`), `src/components/layout/{page-header,empty-state,theme-toggle}.tsx`

**Interfaces (produces cho các task sau):**
- `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>`
- `signSession(uid: string, now?: number): string`, `verifySessionToken(token: string, now?: number): { uid: string } | null`, `SESSION_COOKIE = "session"`
- `getCurrentUser(): Promise<User | null>`, `requireUser(): Promise<User>`, `setSessionCookie(uid): Promise<void>`, `clearSessionCookie(): Promise<void>`
- `readJson(request: Request): Promise<Record<string, unknown> | null>`, `isValidDate(value: string): boolean`, `isMonth(value: string): boolean`, `firstDayOf(month: string): string`
- `DEFAULT_CATEGORIES`, `defaultCategoryRows(userId: string)`
- Schema types: `User`, `Category`, `Transaction`, `Budget`, `CategoryKind`

- [ ] **Step 1: Xoá code life-admin**

```bash
git rm -r --quiet src/app/\(dashboard\) src/app/api/{auth/\[...nextauth\],auth/register,households,entities,entity-relations,tasks,reminders,documents,inbox,files,ai}
git rm -r --quiet src/components/{inbox,entities,deadlines,tasks,ai,home,settings} src/components/layout/navigation.tsx
git rm --quiet src/components/status-badge.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx
git rm -r --quiet src/lib/{ai,db,storage.ts,audit.ts,policy-engine.ts,deadline-urgency.ts,deadline-urgency.test.ts,auth.ts,session.ts}
git rm -r --quiet src/types drizzle uploads
git rm --quiet scripts/seed-demo.ts NATIVE-BINDINGS.md README.md CLAUDE.md AGENTS.md tsconfig.tsbuildinfo next-env.d.ts
git rm --quiet docs/SETUP.md docs/ARCHITECTURE.md docs/DATABASE.md docs/API.md docs/DEVELOPMENT.md docs/ROADMAP.md docs/SPEC.md docs/TROUBLESHOOTING.md
git rm --quiet docs/superpowers/plans/2026-09-12-ui-ux-redesign.md docs/superpowers/specs/2026-09-12-ui-ux-redesign-design.md
```

**Không xoá** `docs/superpowers/specs/2026-09-14-money-app-design.md` và `docs/superpowers/plans/2026-09-14-money-app-rebuild.md` — spec và plan của app mới.
`CLAUDE.md`/`AGENTS.md` bị xoá vì mô tả Life Admin OS; `AGENTS.md` mới được viết ở Task 5.

- [ ] **Step 2: Cập nhật config**

`package.json` — bỏ `@auth/drizzle-adapter`, `next-auth`, `date-fns`, `react-day-picker`, `uuid`, `@types/uuid`; đổi name/metadata:

```json
{
  "name": "money-os",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test": "node --experimental-strip-types --test \"src/**/*.test.ts\"",
    "postinstall": "bash scripts/fix-native-bindings.sh",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "node --experimental-strip-types --env-file=.env.local scripts/seed-demo.ts"
  }
}
```
Giữ nguyên phần `dependencies`/`devDependencies` còn lại như file hiện tại (đặc biệt các optional dep pin cho Linux).

`.env.example` (viết lại toàn bộ):
```
# Database
DATABASE_URL=postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os

# Session cookie signing key (openssl rand -base64 32)
SESSION_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
```
`.env.local`: thêm biến `SESSION_SECRET=` với giá trị sinh bằng `openssl rand -base64 32` (hoặc chuỗi random 32+ ký tự), giữ `DATABASE_URL`, xoá các biến NextAuth/AI/upload.
`.gitignore`: thêm dòng `.commandcode/`, xoá `/uploads`.

- [ ] **Step 3: Viết schema**

`src/lib/db/schema.ts`:

```ts
import {
  bigint, date, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("VND"),
    locale: varchar("locale", { length: 10 }).notNull().default("vi-VN"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    kind: categoryKindEnum("kind").notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#64748b"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("categories_user_idx").on(table.userId, table.kind),
    uniqueIndex("categories_user_kind_name_idx").on(table.userId, table.kind, table.name),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    kind: categoryKindEnum("kind").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.occurredOn),
    index("transactions_user_category_idx").on(table.userId, table.categoryId),
  ]
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    month: date("month", { mode: "string" }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("budgets_user_category_month_idx").on(table.userId, table.categoryId, table.month)]
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type CategoryKind = Category["kind"];
```

`src/lib/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
```

`src/lib/db/default-categories.ts`:

```ts
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
```

- [ ] **Step 4: Reset DB và sinh migration**

Xoá migration cũ xong mới generate để có đúng một `0000`.

```bash
rm -rf drizzle 2>/dev/null || true
docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
npm run db:generate
npm run db:migrate
docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "\dt"
```

**Bắt buộc drop cả schema `drizzle`**: drizzle-kit ghi lịch sử migration vào `drizzle.__drizzle_migrations`. Nếu chỉ drop `public`, migration cũ vẫn được coi là đã apply và `0000` mới sẽ bị bỏ qua im lặng → bảng không được tạo.
Kỳ vọng `\dt`: `budgets`, `categories`, `transactions`, `users` (+ `drizzle.__drizzle_migrations`). Thấy tên bảng cũ (`entities`, `tasks`, …) là chưa drop sạch → làm lại.

- [ ] **Step 5: Viết test cho session token (failing)**

`src/lib/session.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SESSION_SECRET = "test-secret-value";

const { signSession, verifySessionToken } = await import("./session-token.ts");

test("verifies a token it just signed", () => {
  const token = signSession("user-1");
  assert.deepEqual(verifySessionToken(token), { uid: "user-1" });
});

test("rejects a tampered payload", () => {
  const token = signSession("user-1");
  const [body, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ uid: "user-2", exp: 9999999999 })).toString("base64url");
  assert.equal(verifySessionToken(`${forged}.${signature}`), null);
});

test("rejects garbage and expired tokens", () => {
  assert.equal(verifySessionToken("not-a-token"), null);
  assert.equal(verifySessionToken(""), null);
  const expired = signSession("user-1", Date.now() - 40 * 24 * 60 * 60 * 1000);
  assert.equal(verifySessionToken(expired), null);
});
```

- [ ] **Step 6: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./session-token.ts`.

- [ ] **Step 7: Viết session token**

`src/lib/session-token.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type Payload = { uid: string; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signSession(uid: string, now: number = Date.now()): string {
  const payload: Payload = { uid, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string, now: number = Date.now()): { uid: string } | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Payload>;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < now) return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}
```

- [ ] **Step 8: Chạy test cho pass**

Run: `npm test`
Expected: PASS — 3 test.

- [ ] **Step 9: Viết auth, session cookie, validate**

`src/lib/auth.ts`:

```ts
import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

`src/lib/session.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./db/schema";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySessionToken } from "./session-token";

export async function setSessionCookie(uid: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(uid), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.uid) });
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

`src/lib/validate.ts`:

```ts
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CURRENCY_RE = /^[A-Z]{3}$/;
export const LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function firstDayOf(month: string): string {
  return `${month}-01`;
}
```

- [ ] **Step 10: Viết API auth**

`src/app/api/auth/register/route.ts`:

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, users } from "@/lib/db/schema";
import { defaultCategoryRows } from "@/lib/db/default-categories";
import { hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { EMAIL_RE, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (!name || name.length > 100) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const created = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ email, name, passwordHash }).returning();
    await tx.insert(categories).values(defaultCategoryRows(user.id));
    return user;
  });

  await setSessionCookie(created.id);
  return NextResponse.json(
    { user: { id: created.id, email: created.email, name: created.name } },
    { status: 201 }
  );
}
```

`src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const invalid = NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });

  if (!email || !password) return invalid;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return invalid;
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  await setSessionCookie(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
```

`src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 11: Viết app shell, nav, layout**

`src/components/layout/app-nav.tsx` (client, dùng `usePathname`):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, LineChart, Settings, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/review", label: "Review", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

`src/components/layout/app-shell.tsx` — sidebar desktop + `Sheet` mobile (giữ pattern cũ), gồm: brand "Money", `<AppNav />`, `ThemeToggle`, form đăng xuất:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppNav } from "./app-nav";
import { ThemeToggle } from "./theme-toggle";

function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r bg-sidebar p-4 lg:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-3">
            <Wallet aria-hidden className="h-5 w-5 text-primary" />
            <span className="font-semibold">Money</span>
          </div>
          <AppNav />
        </div>
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b p-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="space-y-6">
                <AppNav onNavigate={() => setOpen(false)} />
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Money</span>
        </header>
        <main className="container mx-auto flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

`src/app/(app)/layout.tsx`:

```tsx
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
```

`src/app/layout.tsx` — giữ nguyên bản cũ, chỉ đổi metadata:

```tsx
export const metadata: Metadata = {
  title: "Money",
  description: "Personal money tracker",
};
```

- [ ] **Step 12: Viết trang login/register**

`src/components/auth/login-form.tsx` và `register-form.tsx`: client component, `useState` cho field + `error` + `isSaving`, `POST /api/auth/login|register`, thành công thì `router.replace("/")` + `router.refresh()`, lỗi thì hiện `error` từ JSON. Register có thêm field Name và client-side check `password.length >= 8`.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong");
      setIsSaving(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Track your income and spending.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account? <Link href="/register" className="underline">Create one</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

`RegisterForm` tương tự, thêm field Name, `autoComplete="new-password"`, gọi `/api/auth/register`, link về `/login`.

`src/app/(auth)/login/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
```

`src/app/(auth)/register/page.tsx` tương tự với `RegisterForm`.

Xoá `src/components/auth/login-form.tsx`/`register-form.tsx` cũ nếu còn (đã xoá ở Step 1). Route `/` do `src/app/(app)/page.tsx` đảm nhiệm.

- [ ] **Step 13: Tạo trang `/` tạm để build xanh**

`src/app/(app)/page.tsx`:

```tsx
import { PageHeader } from "@/components/layout/page-header";

export default function OverviewPage() {
  return <PageHeader title="Overview" description="Coming in Task 4." />;
}
```

- [ ] **Step 14: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tsc sạch, lint 0 error, build xanh.

Chạy `npm run dev` (nền) rồi kiểm tra đăng ký/đăng nhập thật:
```bash
curl -i -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"me@test.local\",\"name\":\"Me\",\"password\":\"password123\"}"
```
Expected: 201 + `set-cookie: session=...` và bảng `categories` có 17 dòng cho user mới:
`docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "SELECT kind, count(*) FROM categories GROUP BY kind;"`

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat!: rebuild repo as a single-user personal money app

Replaces the Life Admin OS codebase with the money app foundation:

- delete life-admin modules (inbox, life graph, deadlines, tasks, AI chat)
  together with their schema, API routes and docs
- schema: users, categories, transactions, budgets (money as integer
  minor units, per-transaction currency snapshot, dates as YYYY-MM-DD)
- hand-rolled session auth: bcrypt password hashes plus an HMAC-signed
  HttpOnly cookie, no next-auth and no multi-tenant layer
- register/login/logout API, auth pages and the guarded app shell
- fresh migration 0000 after dropping the old schema (both public and
  the drizzle bookkeeping schema, or the new migration is skipped)

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

### Task 2: Logic tiền (pure functions + test)

**Files:**
- Create: `src/lib/money/amount.ts` + `src/lib/money/amount.test.ts`
- Create: `src/lib/money/period.ts` + `src/lib/money/period.test.ts`
- Create: `src/lib/money/summary.ts` + `src/lib/money/summary.test.ts`
- Create: `src/lib/money/compare.ts` + `src/lib/money/compare.test.ts`
- Create: `src/lib/money/budget.ts` + `src/lib/money/budget.test.ts`
- Create: `src/lib/money/insights.ts` + `src/lib/money/insights.test.ts`
- Create: `src/lib/format.ts`

**Interfaces:**
- Consumes: `CategoryKind` từ `@/lib/db/schema`
- Produces: `minorUnitDigits`, `parseAmount`, `formatMoney`, `formatCompactMoney`, `monthKey`, `monthRange`, `shiftMonth`, `daysInMonth`, `daysElapsed`, `todayKey`, `TransactionLike`, `CategoryLike`, `CategoryTotal`, `MonthSummary`, `summarize`, `CategoryDelta`, `MonthComparison`, `compareMonths`, `BudgetStatus`, `BudgetLine`, `budgetStatus`, `budgetLines`, `Insight`, `InsightInput`, `buildInsights`

- [ ] **Step 1: Test `amount` (fail)**

`src/lib/money/amount.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, minorUnitDigits, parseAmount } from "./amount.ts";

test("minorUnitDigits knows zero-decimal currencies", () => {
  assert.equal(minorUnitDigits("VND"), 0);
  assert.equal(minorUnitDigits("usd"), 2);
});

test("parses VND amounts", () => {
  assert.equal(parseAmount("50000", "VND"), 50_000);
  assert.equal(parseAmount("50.000", "VND"), 50_000);
  assert.equal(parseAmount("1.500.000 đ", "VND"), 1_500_000);
  assert.equal(parseAmount("50k", "VND"), 50_000);
  assert.equal(parseAmount("1,5tr", "VND"), 1_500_000);
  assert.equal(parseAmount("2m", "VND"), 2_000_000);
});

test("parses two-decimal amounts", () => {
  assert.equal(parseAmount("12.50", "USD"), 1_250);
  assert.equal(parseAmount("1,234.56", "USD"), 123_456);
  assert.equal(parseAmount("1.234", "USD"), 123_400);
  assert.equal(parseAmount("7", "USD"), 700);
  assert.equal(parseAmount("1.5k", "USD"), 150_000);
});

test("rejects junk, zero, negative and ambiguous decimals", () => {
  assert.throws(() => parseAmount("", "VND"));
  assert.throws(() => parseAmount("abc", "VND"));
  assert.throws(() => parseAmount("0", "VND"));
  assert.throws(() => parseAmount("-5", "VND"));
  assert.throws(() => parseAmount("100,50", "VND"));
});

test("formats money with Intl", () => {
  assert.equal(formatMoney(50_000, "VND", "vi-VN").replace(/\u00a0/g, " "), "50.000 ₫");
  assert.equal(formatMoney(123_456, "USD", "en-US"), "$1,234.56");
});
```

- [ ] **Step 2: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./amount.ts`.

- [ ] **Step 3: Viết `amount.ts`**

```ts
const ZERO_DECIMAL = new Set(["VND", "JPY", "KRW", "IDR", "CLP", "ISK"]);
const CURRENCY_NOISE = /[₫$€£¥]|\b(vnd|usd|eur|jpy|krw|gbp)\b/g;

export function minorUnitDigits(currency: string): 0 | 2 {
  return ZERO_DECIMAL.has(currency.trim().toUpperCase()) ? 0 : 2;
}

function parseSuffixed(raw: string, digits: 0 | 2): number | null {
  const match = /^(\d+(?:[.,]\d+)?)(k|tr|m)$/.exec(raw);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  const multiplier = match[2] === "k" ? 1_000 : 1_000_000;
  const major = Math.round(value * multiplier);
  return digits === 0 ? major : major * 100;
}

function parseZeroDecimal(raw: string): number | null {
  const parts = raw.split(/[.,]/);
  const last = parts[parts.length - 1] ?? "";
  if (parts.length > 1 && last.length <= 2) return null;
  if (!/^\d+$/.test(raw.replace(/[.,]/g, ""))) return null;
  return Number(raw.replace(/[.,]/g, ""));
}

function parseTwoDecimal(raw: string): number | null {
  const parts = raw.split(/[.,]/);
  if (parts.some((part) => part === "")) return null;
  const last = parts[parts.length - 1];
  const hasDecimal = parts.length > 1 && last.length <= 2 && parts.slice(1, -1).every((part) => part.length === 3);
  if (!hasDecimal && parts.slice(1).some((part) => part.length !== 3)) return null;
  const integerPart = hasDecimal ? parts.slice(0, -1).join("") : parts.join("");
  const fractionPart = hasDecimal ? last.padEnd(2, "0") : "00";
  if (!/^\d+$/.test(integerPart)) return null;
  return Number(integerPart) * 100 + Number(fractionPart);
}

export function parseAmount(input: string, currency: string): number {
  const digits = minorUnitDigits(currency);
  const raw = input.trim().toLowerCase().replace(CURRENCY_NOISE, "").replace(/\s+/g, "");
  if (!raw) throw new Error("Amount is required");
  if (raw.includes("-")) throw new Error("Amount must be positive");

  const parsed = parseSuffixed(raw, digits) ?? (digits === 0 ? parseZeroDecimal(raw) : parseTwoDecimal(raw));
  if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid amount");
  return parsed;
}

function format(minor: number, currency: string, locale: string, compact: boolean): string {
  const digits = minorUnitDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(minor / (digits === 0 ? 1 : 100));
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  return format(minor, currency, locale, false);
}

export function formatCompactMoney(minor: number, currency: string, locale: string): string {
  return format(minor, currency, locale, true);
}
```

- [ ] **Step 4: Chạy test cho pass**

Run: `npm test`
Expected: PASS. Lưu ý kết quả `Intl` có thể dùng non-breaking space — test đã `replace(/\u00a0/g, " ")`; nếu máy này format khác (ví dụ `₫50.000`), sửa kỳ vọng theo output thật.

- [ ] **Step 5: Test `period` (fail)**

`src/lib/money/period.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { daysElapsed, daysInMonth, monthKey, monthRange, shiftMonth, todayKey } from "./period.ts";

test("monthKey uses local date parts", () => {
  assert.equal(monthKey(new Date(2026, 0, 5)), "2026-01");
  assert.equal(monthKey(new Date(2026, 11, 31)), "2026-12");
});

test("todayKey pads", () => {
  assert.equal(todayKey(new Date(2026, 8, 4)), "2026-09-04");
});

test("monthRange covers the whole month", () => {
  assert.deepEqual(monthRange("2026-09"), { start: "2026-09-01", end: "2026-09-30" });
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(monthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
});

test("shiftMonth crosses years", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-09", -2), "2026-07");
});

test("daysElapsed only trims the current month", () => {
  assert.equal(daysInMonth("2026-09"), 30);
  assert.equal(daysElapsed("2026-09", "2026-09-14"), 14);
  assert.equal(daysElapsed("2026-08", "2026-09-14"), 31);
  assert.equal(daysElapsed("2026-12", "2026-09-14"), 31);
});
```

- [ ] **Step 6: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./period.ts`.

- [ ] **Step 7: Viết `period.ts`**

```ts
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function todayKey(date: Date = new Date()): string {
  return `${monthKey(date)}-${pad(date.getDate())}`;
}

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(month))}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export function daysElapsed(month: string, today: string): number {
  return monthKey(new Date(`${today}T00:00:00`)) === month ? Number(today.slice(8, 10)) : daysInMonth(month);
}
```

- [ ] **Step 8: Chạy test cho pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Test `summary` (fail)**

`src/lib/money/summary.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize, type TransactionLike } from "./summary.ts";

const categories = [
  { id: "food", name: "Food & Drinks" },
  { id: "salary", name: "Salary" },
];

const rows: TransactionLike[] = [
  { id: "1", kind: "income", categoryId: "salary", amountMinor: 20_000_000, occurredOn: "2026-09-01", note: null },
  { id: "2", kind: "expense", categoryId: "food", amountMinor: 300_000, occurredOn: "2026-09-02", note: null },
  { id: "3", kind: "expense", categoryId: "food", amountMinor: 200_000, occurredOn: "2026-09-03", note: null },
  { id: "4", kind: "expense", categoryId: null, amountMinor: 100_000, occurredOn: "2026-09-04", note: null },
];

test("summarize totals income, expense, net and savings rate", () => {
  const summary = summarize(rows, categories, { month: "2026-09", daysElapsed: 10 });
  assert.equal(summary.incomeMinor, 20_000_000);
  assert.equal(summary.expenseMinor, 600_000);
  assert.equal(summary.netMinor, 19_400_000);
  assert.equal(summary.savingsRate, 0.97);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.avgPerDayMinor, 60_000);
});

test("summarize groups uncategorized expenses and sorts by total", () => {
  const summary = summarize(rows, categories, { month: "2026-09", daysElapsed: 10 });
  assert.deepEqual(summary.byCategory.map((row) => row.name), ["Food & Drinks", "Uncategorized"]);
  assert.equal(summary.byCategory[0].totalMinor, 500_000);
  assert.equal(summary.byCategory[0].count, 2);
});

test("summarize handles zero income and negative savings", () => {
  const summary = summarize(rows.filter((row) => row.kind === "expense"), categories, { month: "2026-09", daysElapsed: 10 });
  assert.equal(summary.savingsRate, 0);
  assert.equal(summary.netMinor, -600_000);
});
```

- [ ] **Step 10: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./summary.ts`.

- [ ] **Step 11: Viết `summary.ts`**

```ts
import type { CategoryKind } from "@/lib/db/schema";

export type TransactionLike = {
  id: string;
  kind: CategoryKind;
  categoryId: string | null;
  amountMinor: number;
  occurredOn: string;
  note: string | null;
};

export type CategoryLike = { id: string; name: string };

export type CategoryTotal = {
  categoryId: string | null;
  name: string;
  totalMinor: number;
  count: number;
};

export type MonthSummary = {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  savingsRate: number;
  byCategory: CategoryTotal[];
  transactionCount: number;
  avgPerDayMinor: number;
};

export function summarize(
  transactions: TransactionLike[],
  categories: CategoryLike[],
  options: { month: string; daysElapsed: number }
): MonthSummary {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  let incomeMinor = 0;
  let expenseMinor = 0;
  const expenseByCategory = new Map<string | null, CategoryTotal>();

  for (const transaction of transactions) {
    if (transaction.kind === "income") {
      incomeMinor += transaction.amountMinor;
      continue;
    }
    expenseMinor += transaction.amountMinor;
    const key = transaction.categoryId && nameById.has(transaction.categoryId) ? transaction.categoryId : null;
    const row = expenseByCategory.get(key) ?? {
      categoryId: key,
      name: key ? (nameById.get(key) as string) : "Uncategorized",
      totalMinor: 0,
      count: 0,
    };
    row.totalMinor += transaction.amountMinor;
    row.count += 1;
    expenseByCategory.set(key, row);
  }

  const netMinor = incomeMinor - expenseMinor;
  return {
    month: options.month,
    incomeMinor,
    expenseMinor,
    netMinor,
    savingsRate: incomeMinor > 0 ? netMinor / incomeMinor : 0,
    byCategory: [...expenseByCategory.values()].sort((a, b) => b.totalMinor - a.totalMinor),
    transactionCount: transactions.length,
    avgPerDayMinor: options.daysElapsed > 0 ? Math.round(expenseMinor / options.daysElapsed) : 0,
  };
}
```

- [ ] **Step 12: Chạy test cho pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 13: Test `compare` + `budget` (fail)**

`src/lib/money/compare.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { compareMonths } from "./compare.ts";
import type { MonthSummary } from "./summary.ts";

function summary(overrides: Partial<MonthSummary>): MonthSummary {
  return {
    month: "2026-09", incomeMinor: 0, expenseMinor: 0, netMinor: 0, savingsRate: 0,
    byCategory: [], transactionCount: 0, avgPerDayMinor: 0, ...overrides,
  };
}

test("compareMonths reports deltas and pct", () => {
  const current = summary({ month: "2026-09", incomeMinor: 20_000_000, expenseMinor: 12_000_000, savingsRate: 0.4 });
  const previous = summary({ month: "2026-08", incomeMinor: 10_000_000, expenseMinor: 10_000_000, savingsRate: 0 });
  const comparison = compareMonths(current, previous);
  assert.equal(comparison.expenseDeltaMinor, 2_000_000);
  assert.equal(comparison.expenseDeltaPct, 20);
  assert.equal(comparison.incomeDeltaPct, 100);
  assert.equal(comparison.savingsRateDelta, 0.4);
});

test("compareMonths returns null pct when previous month is zero", () => {
  const comparison = compareMonths(summary({ expenseMinor: 500_000 }), summary({}));
  assert.equal(comparison.expenseDeltaPct, null);
  assert.equal(comparison.expenseDeltaMinor, 500_000);
});

test("movers are sorted by absolute delta and capped at 5", () => {
  const current = summary({
    byCategory: [
      { categoryId: "a", name: "A", totalMinor: 100_000, count: 1 },
      { categoryId: "b", name: "B", totalMinor: 900_000, count: 1 },
      { categoryId: "c", name: "C", totalMinor: 300_000, count: 1 },
      { categoryId: "d", name: "D", totalMinor: 400_000, count: 1 },
      { categoryId: "e", name: "E", totalMinor: 500_000, count: 1 },
      { categoryId: "f", name: "F", totalMinor: 600_000, count: 1 },
    ],
  });
  const previous = summary({
    byCategory: [
      { categoryId: "a", name: "A", totalMinor: 1_000_000, count: 1 },
      { categoryId: "b", name: "B", totalMinor: 0, count: 0 },
      { categoryId: "c", name: "C", totalMinor: 0, count: 0 },
      { categoryId: "d", name: "D", totalMinor: 0, count: 0 },
      { categoryId: "e", name: "E", totalMinor: 0, count: 0 },
      { categoryId: "f", name: "F", totalMinor: 0, count: 0 },
    ],
  });
  const comparison = compareMonths(current, previous);
  assert.equal(comparison.movers.length, 5);
  assert.equal(comparison.movers[0].categoryId, "a");
  assert.equal(comparison.movers[0].deltaPct, -90);
});
```

`src/lib/money/budget.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetLines, budgetStatus } from "./budget.ts";
import type { MonthSummary } from "./summary.ts";

test("budgetStatus tone boundaries", () => {
  assert.deepEqual(budgetStatus(790_000, 1_000_000), { pct: 79, remainingMinor: 210_000, tone: "ok" });
  assert.equal(budgetStatus(800_000, 1_000_000).tone, "warn");
  assert.deepEqual(budgetStatus(1_000_000, 1_000_000), { pct: 100, remainingMinor: 0, tone: "warn" });
  assert.deepEqual(budgetStatus(1_010_000, 1_000_000), { pct: 101, remainingMinor: -10_000, tone: "over" });
});

test("budgetStatus defends against a zero limit", () => {
  assert.deepEqual(budgetStatus(0, 0), { pct: 0, remainingMinor: 0, tone: "ok" });
  assert.deepEqual(budgetStatus(50_000, 0), { pct: 100, remainingMinor: -50_000, tone: "over" });
});

test("budgetLines only includes categories with a budget, sorted by pct", () => {
  const summary = {
    month: "2026-09", incomeMinor: 0, expenseMinor: 0, netMinor: 0, savingsRate: 0,
    byCategory: [
      { categoryId: "food", name: "Food & Drinks", totalMinor: 900_000, count: 3 },
      { categoryId: "rent", name: "Rent", totalMinor: 2_000_000, count: 1 },
    ],
    transactionCount: 4, avgPerDayMinor: 0,
  } satisfies MonthSummary;
  const lines = budgetLines(summary, [
    { categoryId: "food", amountMinor: 1_000_000 },
    { categoryId: "rent", amountMinor: 5_000_000 },
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].name, "Food & Drinks");
  assert.equal(lines[0].status.tone, "warn");
  assert.equal(lines[1].status.tone, "ok");
});
```

- [ ] **Step 14: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./compare.ts`, `./budget.ts`.

- [ ] **Step 15: Viết `compare.ts` và `budget.ts`**

`src/lib/money/compare.ts`:

```ts
import type { CategoryTotal, MonthSummary } from "./summary";

export type CategoryDelta = {
  categoryId: string | null;
  name: string;
  currentMinor: number;
  previousMinor: number;
  deltaMinor: number;
  deltaPct: number | null;
};

export type MonthComparison = {
  current: MonthSummary;
  previous: MonthSummary;
  expenseDeltaMinor: number;
  expenseDeltaPct: number | null;
  incomeDeltaMinor: number;
  incomeDeltaPct: number | null;
  savingsRateDelta: number;
  movers: CategoryDelta[];
};

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function mergeCategories(current: CategoryTotal[], previous: CategoryTotal[]): CategoryDelta[] {
  const ids = new Set<string | null>([...current, ...previous].map((row) => row.categoryId));
  return [...ids].map((categoryId) => {
    const now = current.find((row) => row.categoryId === categoryId);
    const before = previous.find((row) => row.categoryId === categoryId);
    const currentMinor = now?.totalMinor ?? 0;
    const previousMinor = before?.totalMinor ?? 0;
    return {
      categoryId,
      name: now?.name ?? before?.name ?? "Uncategorized",
      currentMinor,
      previousMinor,
      deltaMinor: currentMinor - previousMinor,
      deltaPct: pctDelta(currentMinor, previousMinor),
    };
  });
}

export function compareMonths(current: MonthSummary, previous: MonthSummary): MonthComparison {
  return {
    current,
    previous,
    expenseDeltaMinor: current.expenseMinor - previous.expenseMinor,
    expenseDeltaPct: pctDelta(current.expenseMinor, previous.expenseMinor),
    incomeDeltaMinor: current.incomeMinor - previous.incomeMinor,
    incomeDeltaPct: pctDelta(current.incomeMinor, previous.incomeMinor),
    savingsRateDelta: current.savingsRate - previous.savingsRate,
    movers: mergeCategories(current.byCategory, previous.byCategory)
      .sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor))
      .slice(0, 5),
  };
}
```

`src/lib/money/budget.ts`:

```ts
import type { MonthSummary } from "./summary";

export type BudgetStatus = {
  pct: number;
  remainingMinor: number;
  tone: "ok" | "warn" | "over";
};

export type BudgetLine = {
  categoryId: string;
  name: string;
  spentMinor: number;
  limitMinor: number;
  status: BudgetStatus;
};

export function budgetStatus(spentMinor: number, limitMinor: number): BudgetStatus {
  if (limitMinor <= 0) {
    return spentMinor > 0
      ? { pct: 100, remainingMinor: -spentMinor, tone: "over" }
      : { pct: 0, remainingMinor: 0, tone: "ok" };
  }
  const pct = Math.round((spentMinor / limitMinor) * 100);
  const tone = spentMinor > limitMinor ? "over" : pct >= 80 ? "warn" : "ok";
  return { pct, remainingMinor: limitMinor - spentMinor, tone };
}

export function budgetLines(
  summary: MonthSummary,
  budgets: { categoryId: string; amountMinor: number }[]
): BudgetLine[] {
  return budgets
    .map((budget) => {
      const spentMinor = summary.byCategory.find((row) => row.categoryId === budget.categoryId)?.totalMinor ?? 0;
      return {
        categoryId: budget.categoryId,
        name: summary.byCategory.find((row) => row.categoryId === budget.categoryId)?.name ?? "Category",
        spentMinor,
        limitMinor: budget.amountMinor,
        status: budgetStatus(spentMinor, budget.amountMinor),
      };
    })
    .sort((a, b) => b.status.pct - a.status.pct);
}
```

- [ ] **Step 16: Chạy test cho pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 17: Test `insights` (fail)**

`src/lib/money/insights.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInsights } from "./insights.ts";
import { budgetLines } from "./budget.ts";
import { summarize, type TransactionLike } from "./summary.ts";

const categories = [
  { id: "food", name: "Food & Drinks" },
  { id: "rent", name: "Rent" },
  { id: "salary", name: "Salary" },
];

const food = (amountMinor: number, occurredOn: string): TransactionLike => ({
  id: `${occurredOn}-${amountMinor}`, kind: "expense", categoryId: "food", amountMinor, occurredOn, note: null,
});

test("flags a negative savings rate as critical", () => {
  const transactions = [
    { id: "i", kind: "income" as const, categoryId: "salary", amountMinor: 1_000_000, occurredOn: "2026-09-01", note: null },
    food(2_000_000, "2026-09-02"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({ summary, previous: null, budgets: [], transactions, today: "2026-09-10" });
  const insight = insights.find((row) => row.id === "savings-rate");
  assert.equal(insight?.severity, "critical");
});

test("flags over-budget and near-budget categories", () => {
  const transactions = [food(900_000, "2026-09-02"), food(300_000, "2026-09-03"), food(100_000, "2026-09-04")];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const budgets = budgetLines(summary, [
    { categoryId: "food", amountMinor: 1_000_000 },
    { categoryId: "rent", amountMinor: 5_000_000 },
  ]);
  const insights = buildInsights({ summary, previous: null, budgets, transactions, today: "2026-09-10" });
  const over = insights.find((row) => row.id === "budget-over:food");
  assert.equal(over?.severity, "critical");
  const warn = insights.find((row) => row.id === "budget-warn:rent");
  assert.equal(warn, undefined);
});

test("flags a category spike against the previous month", () => {
  const previousRows = [food(100_000, "2026-08-05")];
  const currentRows = [food(600_000, "2026-09-05")];
  const previous = summarize(previousRows, categories, { month: "2026-08", daysElapsed: 31 });
  const summary = summarize(currentRows, categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({
    summary, previous, budgets: [], transactions: [...previousRows, ...currentRows], today: "2026-09-10",
  });
  assert.equal(insights.find((row) => row.id === "category-spike:food")?.severity, "warning");
});

test("reports monthly commitments for three consecutive months", () => {
  const transactions = [
    food(1_000_000, "2026-07-05"), food(1_200_000, "2026-08-05"), food(1_100_000, "2026-09-05"),
  ];
  const summary = summarize(transactions.filter((row) => row.occurredOn.startsWith("2026-09")), categories, { month: "2026-09", daysElapsed: 10 });
  const insights = buildInsights({ summary, previous: null, budgets: [], transactions, today: "2026-09-10" });
  const commitment = insights.find((row) => row.id === "commitments:food");
  assert.equal(commitment?.amountMinor, 1_100_000);
});

test("puts critical insights first and never repeats a severity after a lower one", () => {
  const transactions = [
    { id: "i", kind: "income" as const, categoryId: "salary", amountMinor: 1_000_000, occurredOn: "2026-09-01", note: null },
    food(900_000, "2026-09-02"), food(300_000, "2026-09-03"),
  ];
  const summary = summarize(transactions, categories, { month: "2026-09", daysElapsed: 10 });
  const budgets = budgetLines(summary, [{ categoryId: "food", amountMinor: 1_000_000 }]);
  const insights = buildInsights({ summary, previous: null, budgets, transactions, today: "2026-09-10" });
  assert.equal(insights[0].severity, "critical");
  const order = ["critical", "warning", "info"];
  const indexes = insights.map((row) => order.indexOf(row.severity));
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
});
```

Test riêng cho `pace` và `outlier` bổ sung cùng lúc: dựng 2 tháng dữ liệu chi tiêu, `today` cách đầu tháng ≥ 5 ngày, kỳ vọng có `pace`; và 3 giao dịch cùng category trong đó 1 giao dịch ≥ 3× median → kỳ vọng có `outlier`.

- [ ] **Step 18: Chạy test cho fail**

Run: `npm test`
Expected: FAIL — không resolve được `./insights.ts`.

- [ ] **Step 19: Viết `insights.ts`**

```ts
import type { BudgetLine } from "./budget";
import { shiftMonth } from "./period";
import type { MonthSummary, TransactionLike } from "./summary";

export type InsightSeverity = "info" | "warning" | "critical";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  amountMinor?: number;
  categoryId?: string | null;
};

export type InsightInput = {
  summary: MonthSummary;
  previous: MonthSummary | null;
  budgets: BudgetLine[];
  transactions: TransactionLike[];
  today: string;
};

const RANK: Record<InsightSeverity, number> = { critical: 3, warning: 2, info: 1 };

function savingsRate(summary: MonthSummary, previous: MonthSummary | null): Insight[] {
  if (summary.incomeMinor <= 0) return [];
  const rate = Math.round(summary.savingsRate * 100);
  const delta = previous ? Math.round((summary.savingsRate - previous.savingsRate) * 100) : null;
  return [{
    id: "savings-rate",
    severity: summary.savingsRate < 0 ? "critical" : summary.savingsRate < 0.2 ? "warning" : "info",
    title: `You kept ${rate}% of your income`,
    detail: delta === null ? "No previous month to compare yet." : `${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta)} points from last month.`,
  }];
}

function budgets(rows: BudgetLine[]): Insight[] {
  const out: Insight[] = [];
  for (const row of rows.filter((line) => line.status.tone === "over").slice(0, 3)) {
    out.push({
      id: `budget-over:${row.categoryId}`, severity: "critical", categoryId: row.categoryId,
      title: `${row.name} is over budget`,
      detail: `${row.status.pct}% of the budget used, ${Math.abs(row.status.remainingMinor)} over.`,
      amountMinor: row.spentMinor,
    });
  }
  for (const row of rows.filter((line) => line.status.tone === "warn").slice(0, 3)) {
    out.push({
      id: `budget-warn:${row.categoryId}`, severity: "warning", categoryId: row.categoryId,
      title: `${row.name} is close to its budget`,
      detail: `${row.status.pct}% used, ${row.status.remainingMinor} left.`,
      amountMinor: row.spentMinor,
    });
  }
  return out;
}

function spikes(current: MonthSummary, previous: MonthSummary | null): Insight[] {
  if (!previous || current.expenseMinor <= 0) return [];
  return current.byCategory
    .map((row) => {
      const before = previous.byCategory.find((item) => item.categoryId === row.categoryId)?.totalMinor ?? 0;
      const delta = row.totalMinor - before;
      const pct = before === 0 ? null : Math.round((delta / before) * 100);
      return { row, delta, pct };
    })
    .filter(({ delta, pct }) => delta > 0 && pct !== null && pct >= 30 && delta >= current.expenseMinor * 0.1)
    .slice(0, 2)
    .map(({ row, delta, pct }) => ({
      id: `category-spike:${row.categoryId ?? "uncategorized"}`,
      severity: "warning" as const,
      categoryId: row.categoryId,
      title: `${row.name} jumped ${pct}%`,
      detail: `This month it is up by ${delta} compared with last month.`,
      amountMinor: row.totalMinor,
    }));
}

function topCategory(summary: MonthSummary): Insight[] {
  if (summary.expenseMinor <= 0) return [];
  const top = summary.byCategory[0];
  const share = Math.round((top.totalMinor / summary.expenseMinor) * 100);
  if (share < 30) return [];
  return [{
    id: `top-category:${top.categoryId ?? "uncategorized"}`,
    severity: "info",
    categoryId: top.categoryId,
    title: `${top.name} takes ${share}% of your spending`,
    detail: `${top.count} transaction${top.count === 1 ? "" : "s"} this month.`,
    amountMinor: top.totalMinor,
  }];
}

function commitments(summary: MonthSummary, transactions: TransactionLike[]): Insight[] {
  const months = [summary.month];
  for (const transaction of transactions) {
    const key = transaction.occurredOn.slice(0, 7);
    if (!months.includes(key)) months.push(key);
  }
  const recent = months.sort().slice(-3);
  if (recent.length < 3) return [];
  const totals = new Map<string, Map<string, number>>();
  for (const transaction of transactions) {
    if (transaction.kind !== "expense" || !transaction.categoryId) continue;
    const key = transaction.occurredOn.slice(0, 7);
    if (!recent.includes(key)) continue;
    const perCategory = totals.get(transaction.categoryId) ?? new Map<string, number>();
    perCategory.set(key, (perCategory.get(key) ?? 0) + transaction.amountMinor);
    totals.set(transaction.categoryId, perCategory);
  }
  const out: Insight[] = [];
  for (const [categoryId, perMonth] of totals) {
    if (!recent.every((key) => perMonth.has(key))) continue;
    const average = Math.round([...perMonth.values()].reduce((sum, value) => sum + value, 0) / recent.length);
    out.push({
      id: `commitments:${categoryId}`, severity: "info", categoryId,
      title: `${summary.byCategory.find((row) => row.categoryId === categoryId)?.name ?? "A category"} looks like a monthly commitment`,
      detail: "≈ this amount every month for the last three months.",
      amountMinor: average,
    });
  }
  return out.slice(0, 2);
}

function pace(summary: MonthSummary, transactions: TransactionLike[], today: string): Insight[] {
  if (today.slice(0, 7) !== summary.month) return [];
  const day = Number(today.slice(8, 10));
  if (day < 5) return [];
  const previousMonth = shiftMonth(summary.month, -1);
  const previousRows = transactions.filter((row) => row.kind === "expense" && row.occurredOn.startsWith(previousMonth));
  if (!previousRows.length) return [];
  const previousSoFar = previousRows
    .filter((row) => Number(row.occurredOn.slice(8, 10)) <= day)
    .reduce((sum, row) => sum + row.amountMinor, 0);
  if (previousSoFar <= 0) return [];
  const change = Math.round(((summary.expenseMinor - previousSoFar) / previousSoFar) * 100);
  if (Math.abs(change) < 15) return [];
  return [{
    id: "pace",
    severity: change > 0 ? "warning" : "info",
    amountMinor: summary.expenseMinor,
    title: change > 0 ? `You are spending ${change}% faster than last month` : `You are spending ${Math.abs(change)}% slower than last month`,
    detail: `Compared with the first ${day} days of last month.`,
  }];
}

function outliers(summary: MonthSummary, transactions: TransactionLike[]): Insight[] {
  const rows = transactions.filter((row) => row.kind === "expense" && row.occurredOn.startsWith(summary.month));
  const byCategory = new Map<string, TransactionLike[]>();
  for (const row of rows) {
    if (!row.categoryId) continue;
    byCategory.set(row.categoryId, [...(byCategory.get(row.categoryId) ?? []), row]);
  }
  const out: Insight[] = [];
  for (const [categoryId, items] of byCategory) {
    if (items.length < 3) continue;
    const sorted = items.map((item) => item.amountMinor).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const biggest = items.find((item) => item.amountMinor >= median * 3 && item.amountMinor >= summary.expenseMinor * 0.05);
    if (!biggest) continue;
    out.push({
      id: `outlier:${biggest.id}`, severity: "warning", categoryId,
      title: "Unusually large transaction",
      detail: `${biggest.occurredOn} is at least three times the median for this category.`,
      amountMinor: biggest.amountMinor,
    });
  }
  return out.slice(0, 2);
}

export function buildInsights(input: InsightInput): Insight[] {
  const { summary, previous, budgets: budgetRows, transactions, today } = input;
  return [
    ...savingsRate(summary, previous),
    ...budgets(budgetRows),
    ...spikes(summary, previous),
    ...topCategory(summary),
    ...commitments(summary, transactions),
    ...pace(summary, transactions, today),
    ...outliers(summary, transactions),
  ].sort((a, b) => RANK[b.severity] - RANK[a.severity] || (b.amountMinor ?? 0) - (a.amountMinor ?? 0));
}
```

- [ ] **Step 20: Chạy test cho pass**

Run: `npm test`
Expected: PASS toàn bộ. Sửa test nếu kỳ vọng lệch với hành vi đã định nghĩa trong spec (spec là nguồn sự thật), không sửa code cho khớp test sai.

- [ ] **Step 21: Viết `format.ts`**

`src/lib/format.ts`:

```ts
export function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

export function formatMonthLabel(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })
    .format(new Date(`${month}-01T00:00:00`));
}

export function formatDayLabel(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short" })
    .format(new Date(`${value}T00:00:00`));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
```

- [ ] **Step 22: Verify + commit**

```bash
npx tsc --noEmit
npm run lint
npm test
git add -A
git commit -F - <<'EOF'
feat(money): pure money logic with unit tests

- amount: parse/format money as integer minor units, zero-decimal
  currencies handled, VND shorthand (50k, 1,5tr) supported
- period: month keys, ranges, shifts and elapsed days, no timezone drift
- summary: month totals, savings rate, per-category breakdown
- compare: month-over-month deltas and top movers
- budget: status tone boundaries plus budget lines for the UI
- insights: eight deterministic rules with severity ordering

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

### Task 3: API mutation

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`
- Create: `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`
- Create: `src/app/api/budgets/route.ts`
- Create: `src/app/api/settings/route.ts`, `src/app/api/settings/password/route.ts`

**Interfaces:**
- Consumes: `getCurrentUser`, `hashPassword`/`verifyPassword`, `parseAmount`, `readJson`/`isValidDate`/`isMonth`/`firstDayOf`/`CURRENCY_RE`/`LOCALE_RE`/`COLOR_RE`, schema tables
- Produces: REST endpoints dùng ở Task 4 — `POST/PATCH/DELETE /api/transactions`, `POST/PATCH/DELETE /api/categories`, `PUT /api/budgets`, `PATCH /api/settings`, `POST /api/settings/password`

- [ ] **Step 1: API categories**

`src/app/api/categories/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { COLOR_RE, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = body.kind;
  const color = typeof body.color === "string" && COLOR_RE.test(body.color) ? body.color : "#64748b";

  if (!name || name.length > 50) return NextResponse.json({ error: "Name must be 1-50 characters" }, { status: 400 });
  if (kind !== "income" && kind !== "expense") return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.userId, user.id), eq(categories.kind, kind), eq(categories.name, name)),
  });
  if (existing) return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });

  const [category] = await db
    .insert(categories)
    .values({ userId: user.id, name, kind, color })
    .returning();

  return NextResponse.json({ category }, { status: 201 });
}
```

`src/app/api/categories/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { COLOR_RE, readJson } from "@/lib/validate";

type Params = { params: Promise<{ id: string }> };

async function resolve(id: string, userId: string) {
  return db.query.categories.findFirst({ where: and(eq(categories.id, id), eq(categories.userId, userId)) });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const category = await resolve(id, user.id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (body.kind !== undefined) return NextResponse.json({ error: "Category kind cannot be changed" }, { status: 400 });

  const updates: Partial<typeof categories.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 50) return NextResponse.json({ error: "Name must be 1-50 characters" }, { status: 400 });
    updates.name = name;
  }
  if (typeof body.color === "string") {
    if (!COLOR_RE.test(body.color)) return NextResponse.json({ error: "Color must be a hex value like #64748b" }, { status: 400 });
    updates.color = body.color;
  }
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (typeof body.archived === "boolean") updates.archivedAt = body.archived ? new Date() : null;

  const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
  return NextResponse.json({ category: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const category = await resolve(id, user.id);
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.categoryId, id)))
    .limit(1);
  if (used) return NextResponse.json({ error: "This category has transactions. Archive it instead." }, { status: 409 });

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: API transactions**

`src/app/api/transactions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseAmount } from "@/lib/money/amount";
import { isValidDate, readJson } from "@/lib/validate";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const kind = body.kind;
  if (kind !== "income" && kind !== "expense") {
    return NextResponse.json({ error: "Kind must be income or expense" }, { status: 400 });
  }

  const occurredOn = typeof body.occurredOn === "string" ? body.occurredOn : "";
  if (!isValidDate(occurredOn)) return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });

  let amountMinor: number;
  try {
    amountMinor = parseAmount(typeof body.amount === "string" ? body.amount : String(body.amount ?? ""), user.currency);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid amount" }, { status: 400 });
  }

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.userId, user.id)),
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.kind !== kind) {
      return NextResponse.json({ error: "Category does not match the transaction type" }, { status: 400 });
    }
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const [transaction] = await db
    .insert(transactions)
    .values({ userId: user.id, kind, categoryId, amountMinor, currency: user.currency, occurredOn, note })
    .returning();

  return NextResponse.json({ transaction }, { status: 201 });
}
```

`src/app/api/transactions/[id]/route.ts` — PATCH giống POST nhưng chỉ cập nhật field có mặt (dùng `resolve(id, userId)` trả 404 nếu không thuộc user; kiểm tra category cùng `kind` sau khi merge với giá trị hiện tại), DELETE xoá cứng:

```ts
const kind = (body.kind ?? existing.kind) as "income" | "expense";
const categoryId = body.categoryId === undefined ? existing.categoryId : (typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null);
```
`amount` nếu có thì parse lại bằng `user.currency`, `occurredOn` nếu có thì validate. Xoá cứng vì đây là dữ liệu người dùng tự nhập và có confirm ở UI.

- [ ] **Step 3: API budgets**

`src/app/api/budgets/route.ts` — bulk upsert trong 1 transaction, `amount` là chuỗi thô hoặc `null` để xoá:

```ts
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const month = typeof body.month === "string" ? body.month : "";
  if (!isMonth(month)) return NextResponse.json({ error: "Month must look like 2026-09" }, { status: 400 });

  const entries = Array.isArray(body.entries) ? body.entries : null;
  if (!entries) return NextResponse.json({ error: "Entries must be a list" }, { status: 400 });

  const ownCategories = await db.query.categories.findMany({ where: eq(categories.userId, user.id) });
  const ownIds = new Set(ownCategories.filter((row) => row.kind === "expense").map((row) => row.id));

  const parsed: { categoryId: string; amountMinor: number | null }[] = [];
  for (const entry of entries as Record<string, unknown>[]) {
    const categoryId = typeof entry.categoryId === "string" ? entry.categoryId : "";
    if (!ownIds.has(categoryId)) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const raw = entry.amount;
    if (raw === null || raw === undefined || raw === "") {
      parsed.push({ categoryId, amountMinor: null });
      continue;
    }
    try {
      parsed.push({ categoryId, amountMinor: parseAmount(String(raw), user.currency) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid amount" }, { status: 400 });
    }
  }

  await db.transaction(async (tx) => {
    for (const entry of parsed) {
      if (entry.amountMinor === null) {
        await tx.delete(budgets).where(and(eq(budgets.userId, user.id), eq(budgets.categoryId, entry.categoryId), eq(budgets.month, firstDayOf(month))));
        continue;
      }
      await tx
        .insert(budgets)
        .values({ userId: user.id, categoryId: entry.categoryId, month: firstDayOf(month), amountMinor: entry.amountMinor })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.categoryId, budgets.month],
          set: { amountMinor: entry.amountMinor, updatedAt: new Date() },
        });
    }
  });

  const rows = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, user.id), eq(budgets.month, firstDayOf(month))),
  });
  return NextResponse.json({ budgets: rows });
}
```

- [ ] **Step 4: API settings**

`src/app/api/settings/route.ts` — `PATCH` cho `name`/`currency`/`locale`. Đổi `currency` bị chặn 409 khi user đã có giao dịch:

```ts
if (typeof body.currency === "string") {
  const currency = body.currency.trim().toUpperCase();
  if (!CURRENCY_RE.test(currency)) return NextResponse.json({ error: "Currency must be a 3-letter code" }, { status: 400 });
  if (currency !== user.currency) {
    const [existing] = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, user.id)).limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Currency cannot change once you have transactions. Delete your transactions first." },
        { status: 409 }
      );
    }
    updates.currency = currency;
  }
}
```
`locale` validate bằng `LOCALE_RE`, `name` 1–100 ký tự. Response `{ user }` (không gồm `passwordHash` — chọn field cụ thể khi trả về).

`src/app/api/settings/password/route.ts` — `POST` `{ current, next }`: verify `current` với `verifyPassword`, `next` ≥ 8 ký tự và khác `current`, ghi `passwordHash` mới, trả `{ ok: true }`. Sai mật khẩu hiện tại → 401.

- [ ] **Step 5: Verify bằng curl**

Chạy `npm run dev` nền, đăng nhập lấy cookie rồi kiểm tra từng endpoint:

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"me@test.local\",\"password\":\"password123\"}"
curl -s -b cookies.txt -X POST http://localhost:3000/api/transactions -H "Content-Type: application/json" -d "{\"kind\":\"expense\",\"amount\":\"65k\",\"occurredOn\":\"2026-09-14\",\"note\":\"Lunch\"}"
curl -s -b cookies.txt -X PUT http://localhost:3000/api/budgets -H "Content-Type: application/json" -d "{\"month\":\"2026-09\",\"entries\":[]}"
curl -s -b cookies.txt -X PATCH http://localhost:3000/api/settings -H "Content-Type: application/json" -d "{\"currency\":\"USD\"}"
```
Expected: transaction 201 với `amountMinor: 65000`; PATCH settings đổi currency → **409** (đã có giao dịch); request không có cookie → 401.

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit
npm run lint
git add -A
git commit -F - <<'EOF'
feat(api): transaction, category, budget and settings endpoints

- categories: create, rename/recolor/archive, delete blocked while the
  category still has transactions
- transactions: create/update/delete with the raw amount string parsed
  server-side so money parsing lives in exactly one place
- budgets: bulk upsert per month inside a single transaction
- settings: profile updates, currency change blocked once transactions
  exist, password change verifies the current password

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

### Task 4: UI các trang

**Files:**
- Create: `src/components/money/month-nav.tsx`, `summary-cards.tsx`, `insight-list.tsx`, `budget-list.tsx`, `category-bars.tsx`, `transaction-form.tsx`, `transaction-list.tsx`, `category-manager.tsx`, `settings-form.tsx`
- Create: `src/app/(app)/page.tsx` (Overview, thay bản tạm), `transactions/page.tsx`, `categories/page.tsx`, `review/page.tsx`, `settings/page.tsx`
- Create: `src/app/(app)/loading.tsx`, `error.tsx`, `not-found.tsx`

**Interfaces:**
- Consumes: mọi thứ từ Task 2 và Task 3; `requireUser()`; `PageHeader`, `EmptyState`, `StatusBadge`
- Produces: 5 trang hoàn chỉnh

Quy ước dùng chung cho mọi trang:
- `export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> })` → `const { month } = await searchParams`, `const selected = month && isMonth(month) ? month : monthKey(new Date())`.
- Query giao dịch 3 tháng: `between(transactions.occurredOn, monthRange(shiftMonth(selected, -2)).start, monthRange(selected).end)`; tách bucket theo `occurredOn.slice(0, 7)`.
- `const user = await requireUser()` để có `currency`/`locale`.
- Mọi số tiền format bằng `formatMoney(minor, user.currency, user.locale)`; bảng/biểu đồ đặt trong `<Card>`; khoảng cách `space-y-6`.

- [ ] **Step 1: Component nền**

`src/components/status-badge.tsx` — tạo lại bản gọn (bản cũ bị xoá ở Task 1 vì chứa helper của life-admin):

```tsx
import type { ReactNode } from "react";
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

export function StatusBadge({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <Badge variant={toneVariants[tone]} className={`${toneClasses[tone]} ${className ?? ""}`.trim()}>
      {children}
    </Badge>
  );
}

export function insightTone(severity: string): StatusTone {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export function budgetTone(tone: string): StatusTone {
  if (tone === "over") return "danger";
  if (tone === "warn") return "warning";
  return "success";
}
```

`src/components/money/month-nav.tsx` (server component, dùng `Link`):

```tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/format";
import { shiftMonth } from "@/lib/money/period";

export function MonthNav({ month, basePath, locale }: { month: string; basePath: string; locale: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous month" render={<Link href={`${basePath}?month=${shiftMonth(month, -1)}`} />}>
        <ChevronLeft />
      </Button>
      <span className="min-w-40 text-center text-sm font-medium tabular-nums">{formatMonthLabel(month, locale)}</span>
      <Button variant="outline" size="icon" aria-label="Next month" render={<Link href={`${basePath}?month=${shiftMonth(month, 1)}`} />}>
        <ChevronRight />
      </Button>
    </div>
  );
}
```

`src/components/money/summary-cards.tsx` (presentational, không `"use client"`):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money/amount";
import { formatPercent } from "@/lib/format";
import type { MonthSummary } from "@/lib/money/summary";

export function SummaryCards({ summary, currency, locale }: { summary: MonthSummary; currency: string; locale: string }) {
  const items = [
    { label: "Income", value: formatMoney(summary.incomeMinor, currency, locale), tone: "text-success" },
    { label: "Expenses", value: formatMoney(summary.expenseMinor, currency, locale), tone: "" },
    { label: "Net", value: formatMoney(summary.netMinor, currency, locale), tone: summary.netMinor >= 0 ? "text-success" : "text-destructive" },
    { label: "Savings rate", value: formatPercent(summary.savingsRate * 100), tone: summary.savingsRate >= 0.2 ? "text-success" : "" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-semibold tabular-nums ${item.tone}`}>{item.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
```

`src/components/money/insight-list.tsx` — map severity → `StatusTone` (`critical` → `danger`, `warning` → `warning`, `info` → `info`) và render `<Card>` mỗi insight: `StatusBadge` + title + detail + số tiền (nếu có) bằng `formatMoney`. Props: `{ insights, currency, locale, emptyLabel }`; rỗng thì render `<EmptyState icon={Sparkles} title={emptyLabel} />`.

`src/components/money/budget-list.tsx` — mỗi dòng `<BudgetLine>`: tên category, `spent / limit`, thanh `div` với `width: pct%` (kẹp ở 100) và màu theo tone (`bg-success`/`bg-warning`/`bg-destructive`), phần còn lại hoặc vượt. Props: `{ lines, currency, locale, emptyLabel }`.

`src/components/money/category-bars.tsx` — với mỗi category trong `summary.byCategory` (đã sort sẵn): chấm màu (`backgroundColor: category.color`), tên, `formatMoney`, `formatPercent(share)`, bar ngang `width: share%`. Props: `{ rows: { categoryId: string | null; name: string; totalMinor: number; count: number; color: string }[]; expenseMinor: number; currency: string; locale: string }`.

- [ ] **Step 2: Trang Overview**

`src/app/(app)/page.tsx`: query user + giao dịch 3 tháng + budgets tháng đang chọn; tính `summarize` cho tháng đang chọn và tháng trước; `budgetLines`; `buildInsights`; render:
1. `<PageHeader title="Overview" description={...} action={<TransactionForm ... />} />`
2. `<MonthNav />`
3. `<SummaryCards />`
4. `<BudgetList lines={...} />` (tối đa 4 dòng)
5. `<InsightList insights={insights.slice(0, 3)} />`
6. Card "Recent transactions": 5 dòng mới nhất sort `occurredOn` desc + link `View all` → `/transactions?month=...`
7. Chưa có giao dịch nào trong tháng → `<EmptyState icon={Wallet} title="Nothing recorded yet" description="Add your first income or expense for this month." />`

Daily buckets: giao dịch tháng này lấy từ mảng 3 tháng đã query bằng `.filter((row) => row.occurredOn.startsWith(selected))`.

- [ ] **Step 3: Trang Transactions + form**

`src/components/money/transaction-form.tsx` (`"use client"`) — dialog dùng cho cả Add và Edit:
- Props: `{ categories: { id: string; name: string; kind: CategoryKind; color: string; archivedAt: Date | null }[]; transaction?: Transaction; currency: string; locale: string; today: string; recentByNote: Record<string, string>; trigger: React.ReactNode }`.
- State: `kind`, `categoryId`, `amount` (chuỗi thô), `occurredOn` (mặc định `today`), `note`.
- Chọn kind bằng segmented control 2 nút `Income` / `Expense`; đổi kind thì reset `categoryId` nếu category đang chọn không cùng kind.
- Category select lọc theo `kind` và loại category đã archive (trừ khi đang là category của giao dịch đang sửa).
- **Gợi ý category theo note**: khi `note` khớp key trong `recentByNote` (đã chuẩn hoá `trim().toLowerCase()` ở server) và `categoryId` đang rỗng → set `categoryId` tương ứng. Không có fuzzy match.
- Submit: `POST /api/transactions` hoặc `PATCH /api/transactions/[id]`, body `{ kind, categoryId, amount, occurredOn, note }`; `amount` gửi nguyên chuỗi người dùng gõ. Thành công → đóng dialog, `router.refresh()`. Lỗi → hiện message từ `{ error }`.
- Nút submit `disabled={isSaving || !amount.trim()}`.

`src/components/money/transaction-list.tsx` (`"use client"`) — props `{ transactions, categories, currency, locale }`:
- Nhóm theo `occurredOn` desc; mỗi nhóm có header `formatDayLabel` + tổng chi trong ngày.
- Dòng: chấm màu + tên category (hoặc "Uncategorized"), note (muted, cắt 1 dòng), số tiền (`text-success` nếu income, `tabular-nums`).
- Mỗi dòng có `DropdownMenu` với Edit (mở `TransactionForm`) và Delete (mở `AlertDialog`-style confirm bằng `Dialog`): Delete gọi `DELETE /api/transactions/[id]` rồi `router.refresh()`.

`src/app/(app)/transactions/page.tsx`:
- `<PageHeader title="Transactions" action={<TransactionForm ... />} />`
- `<MonthNav />`
- Filter dạng link (`?month=&kind=&categoryId=&q=`): 3 nút All/Income/Expense và select category; giữ `month` khi đổi filter.
- `recentByNote`: query 300 giao dịch gần nhất có `note`, build map `note.trim().toLowerCase()` → `categoryId` (lấy lần xuất hiện mới nhất).
- `<TransactionList />` hoặc `<EmptyState />`.

- [ ] **Step 4: Trang Categories**

`src/components/money/category-manager.tsx` (`"use client"`) — props `{ categories, budgets, spentByCategory, month, currency, locale }`:
- Hai cột Income/Expense (`grid gap-6 lg:grid-cols-2`), mỗi cột một `<Card>`.
- Dòng: chấm màu, tên, `{count} transactions`, tổng chi tháng này, input budget (defaultValue = budget hiện tại đã format sẵn dạng chuỗi số, `onBlur` → `PUT /api/budgets` với `{ month, entries: [{ categoryId, amount }] }`).
- Hành động: sửa (dialog name + color), archive/restore (`PATCH { archived: true|false }`), xoá (`DELETE`, hiện message 409 nếu còn giao dịch).
- Nút "New category" mở dialog tạo: chọn kind + name + color.

`src/app/(app)/categories/page.tsx`: query categories (gồm cả archived), budgets của tháng, và tổng chi theo category tháng này (từ `summarize`).

- [ ] **Step 5: Trang Review**

`src/app/(app)/review/page.tsx`: như Overview nhưng render đủ:
1. `<PageHeader title="Review" />` + `<MonthNav />`
2. `<SummaryCards />` + delta so tháng trước (mũi tên lên/xuống kèm `formatMoney` chênh lệch, dùng `expenseDeltaMinor`/`incomeDeltaMinor`)
3. `<CategoryBars rows={...} />`
4. Card "Compared with last month" — bảng movers: name, current, previous, delta (`+`/`-`), `deltaPct` (hiện `—` khi null)
5. `<BudgetList lines={budgetLines} />`
6. `<InsightList insights={insights} />` (tất cả)

- [ ] **Step 6: Trang Settings**

`src/components/money/settings-form.tsx` (`"use client"`) — props `{ user: { name, email, currency, locale }, hasTransactions: boolean }`:
- Form profile: name, currency (select VND/USD/EUR/JPY/KRW + input tự do), locale (VND → `vi-VN`, USD/EUR → `en-US`, JP → `ja-JP` gợi ý), submit `PATCH /api/settings`.
- Currency `disabled` khi `hasTransactions` + ghi chú "You can change this once you delete all transactions." (và hiện lỗi 409 nếu vẫn bị chặn).
- Form password: current + next + confirm; `POST /api/settings/password`; thành công → xoá field + hiện "Password updated".

`src/app/(app)/settings/page.tsx`: `requireUser()` + đếm giao dịch (`select { id } ... limit 1`) để truyền `hasTransactions`; hiển thị email readonly.

- [ ] **Step 7: loading/error/not-found**

`src/app/(app)/loading.tsx` — 2 `<Skeleton>` trong `<Card>`.
`src/app/(app)/error.tsx` — `"use client"`, hiện message + nút "Try again" (`reset()`).
`src/app/(app)/not-found.tsx` — `EmptyState` + link về `/`.

- [ ] **Step 8: Verify thủ công**

```bash
npm run dev
```
Mở `http://localhost:3000` bằng user `me@test.local` (task 1) hoặc user demo (task 5). Kiểm tra lần lượt: thêm thu nhập → thêm chi → sửa giao dịch → xoá → nhập cùng `note` lần hai để thấy category được gợi ý → đặt budget → xem Review đổi số → đổi currency ở Settings khi đã có giao dịch (phải bị khoá). Dark mode toggle vẫn chạy.

- [ ] **Step 9: Verify + commit**

```bash
npx tsc --noEmit
npm run lint
npm run build
git add -A
git commit -F - <<'EOF'
feat(ui): overview, transactions, categories, review and settings pages

- overview: month totals, top budgets, three insights, recent activity
- transactions: month navigation, filters, day grouping, add/edit/delete
  with the category suggestion based on how a note was categorised before
- categories: income/expense columns, inline budget per month, archive
- review: category bars, month-over-month movers, budgets and insights
- settings: profile, currency locked once transactions exist, password

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

### Task 5: Seed, docs, AGENTS.md

**Files:**
- Create: `scripts/seed-demo.ts`
- Create: `README.md`, `AGENTS.md`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/DEVELOPMENT.md`, `docs/ROADMAP.md`, `docs/TROUBLESHOOTING.md`

**Interfaces:**
- Consumes: schema, `defaultCategoryRows`, `hashPassword`, `monthKey`/`shiftMonth`/`todayKey`
- Produces: user demo `demo@money.local` / `money1234` với 6 tháng dữ liệu

- [ ] **Step 1: Viết seed script**

`scripts/seed-demo.ts`:
- Đọc `DATABASE_URL` từ env (`npm run db:seed` đã truyền `--env-file=.env.local`).
- Upsert user `demo@money.local` (name "Demo User", currency VND, locale vi-VN, password `money1234` hash cost 10); nếu đã tồn tại thì đổi mật khẩu về `money1234` và xoá sạch `transactions`/`budgets`/`categories` của user đó rồi tạo lại.
- Insert `defaultCategoryRows(user.id)`.
- Sinh 6 tháng gần nhất (từ `monthKey(new Date())` lùi về 5 tháng): mỗi tháng 1 thu nhập Salary (18–22 triệu) + 1 Freelance (0–5 triệu, có tháng không có), và 25–45 giao dịch chi rải khắp các category với số tiền VND thực tế (Food & Drinks 30k–250k, Groceries 150k–900k, Transport 20k–180k, Rent 6.000.000 cố định ngày 05, Utilities 400k–900k, Phone & Internet 200k, Health 100k–1.200k, Shopping 200k–1.800k, Entertainment 100k–800k, Education 0–1.500k, Gifts & Donations 200k–1.000k).
- Chủ ý: **một tháng chi vượt thu** (để rule `savings-rate` ra `critical`), và một category tăng mạnh so với tháng trước (để rule `category-spike` bắt được).
- Random có seed cố định (LCG tự viết, không thêm dep) để chạy lại cho cùng kết quả.
- Insert budgets cho tháng hiện tại: Food & Drinks 6.000.000, Groceries 4.000.000, Transport 2.000.000, Shopping 3.000.000 (đặt sao cho có ít nhất 1 budget `warn` và 1 `over` với dữ liệu đã sinh).
- Kết thúc bằng `console.log` in thông tin đăng nhập + số giao dịch đã tạo.
- `await pool.end()` khi xong để script thoát.

- [ ] **Step 2: Chạy seed và verify dữ liệu**

```bash
npm run db:seed
docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "SELECT date_trunc('month', occurred_on) AS month, kind, count(*), sum(amount_minor) FROM transactions GROUP BY 1, 2 ORDER BY 1, 2;"
```
Expected: 6 tháng, mỗi tháng có cả income và expense; có 1 tháng `sum(expense) > sum(income)`.

- [ ] **Step 3: Kiểm tra insight trên UI**

`npm run dev`, đăng nhập `demo@money.local` / `money1234`, mở `/review`: mỗi nhóm insight (savings rate, budget, spike, commitments) phải xuất hiện ít nhất một lần trong 6 tháng khi chuyển tháng. Nếu rule nào không bao giờ xuất hiện, sửa **dữ liệu seed** (không sửa rule) để tạo đúng tình huống.

- [ ] **Step 4: Viết docs**

- `README.md`: giới thiệu app (tiếng Việt), stack thực tế, quick start (Docker postgres port 5433, `.env.local`, `db:migrate`, `db:seed`, `npm run dev`), bảng npm scripts, bảng tài liệu, trạng thái tính năng + việc tiếp theo.
- `docs/SETUP.md`: setup máy mới từ A–Z + checklist verify + ghi chú Windows (`npm install --include=optional --force`).
- `docs/ARCHITECTURE.md`: kiến trúc server-first, luồng đọc/ghi, mô hình auth (cookie + HMAC), cách scope theo `userId`, quy ước tiền (minor units + currency snapshot), cấu trúc thư mục.
- `docs/DATABASE.md`: sơ đồ 4 bảng, chi tiết cột, quy ước tiền/ngày, workflow migration (generate/migrate, **cảnh báo drop schema `drizzle` khi reset**), backup/restore bằng `pg_dump`, query debug hay dùng.
- `docs/API.md`: bảng endpoint như spec §6 + ví dụ curl có cookie.
- `docs/DEVELOPMENT.md`: quy ước code (server page + client component, `{ error }` + status, không thêm dep, UI tiếng Anh), cách thêm một trang/endpoint mới, cách chạy test, quy tắc commit.
- `docs/ROADMAP.md`: đã xong (5 task này) + danh sách "việc để sau" copy từ spec §11.
- `docs/TROUBLESHOOTING.md`: native bindings trên Windows/Linux, lỗi `column specified more than once` khi trùng tên cột, migration bị skip sau khi reset DB, `Intl` khác nhau giữa các máy.
- `AGENTS.md`: ngắn gọn — stack, lệnh hay dùng, quy ước, nhắc đọc guide Next trong `node_modules/next/dist/docs/`.

- [ ] **Step 5: Verify cuối cùng**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```
Expected: tất cả xanh, 0 lint error.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -F - <<'EOF'
chore: demo seed data and rewritten docs

- seed six months of realistic VND activity for demo@money.local,
  including a month that overspends and a category spike so the insight
  rules have something real to report
- docs: setup, architecture, database, API, development, roadmap and
  troubleshooting, all rewritten for the money app
- AGENTS.md describes the money app conventions

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## Ghi chú cho người thực thi

- Thứ tự task là bắt buộc: Task 2 phụ thuộc Task 1 (schema), Task 3 phụ thuộc Task 2 (parse/validate), Task 4 phụ thuộc Task 3 (endpoint), Task 5 phụ thuộc Task 4.
- Sau mỗi task, repo **phải** build được. Nếu một task để lại build đỏ, sửa trước khi sang task sau.
- Không tự thêm tính năng ngoài spec (ví, giao dịch định kỳ, import, AI). Spec §11 đã ghi rõ phần để sau.
- Khi một kỳ vọng test lệch với hành vi: spec là nguồn sự thật, sửa test theo spec; nếu spec mơ hồ, chọn hành vi đơn giản hơn và ghi lại trong commit message.
