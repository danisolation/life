# Money App — Design Spec

Ngày: 2026-09-14
Trạng thái: chờ user duyệt
Tiền thân: repo `life-admin-os` (Life Admin OS) — sẽ bị xoá code và xây lại thành app này.

## 1. Mục tiêu

App quản lý tiền cá nhân, một người dùng: ghi thu nhập, ghi chi tiêu, phân loại,
đặt ngân sách theo category, và có trang đánh giá hàng tháng kèm insight.

Vòng lặp cốt lõi: **nhập → phân loại → xem tháng này → đánh giá → điều chỉnh**.

### Trong phạm vi v1

- Ghi thu nhập và chi tiêu; mỗi giao dịch có số tiền, loại, category, ngày, ghi chú.
- Category tự tạo, có bộ mặc định khi đăng ký.
- Ngân sách theo category cho từng tháng.
- Trang Overview (tháng hiện tại) và Review (đánh giá theo tháng).
- Insight tính bằng code (không AI) — 8 rule liệt kê ở §5.
- Settings: tên hiển thị, currency, locale, đổi mật khẩu.

### Ngoài phạm vi (để sau, ghi ROADMAP)

Ví/tài khoản và số dư · chuyển khoản · giao dịch định kỳ tự sinh · import CSV ·
chụp hoá đơn / bóc tách bằng AI · nhiều người dùng, chia sẻ, OAuth Google ·
đa tiền tệ · xuất báo cáo · nhắc nhở/notification.

## 2. Quyết định đã chốt

| Chủ đề | Chốt |
| --- | --- |
| Nền tảng | Xoá sạch code repo hiện tại, scaffold lại trong chính repo này, giữ `.git` + lịch sử |
| Người dùng | Single-user. Session tự viết (bcrypt + cookie HttpOnly ký HMAC). Bỏ NextAuth, bỏ household/multi-tenant, bỏ role |
| Database | Reset sạch: drop toàn bộ bảng cũ, migration `0000` chỉ chứa schema mới. **Data cũ mất** (chỉ là data demo) |
| Ví/tài khoản | Không có trong v1 |
| Đánh giá | Có budget + insight sâu, tính hoàn toàn bằng code, không AI |
| Ngôn ngữ UI | Tiếng Anh. Docs và trao đổi: tiếng Việt |
| Dependency | Hạn chế tối đa, ưu tiên có sẵn (`Intl`, `node:test`, bar bằng CSS thay vì chart lib) |

## 3. Kiến trúc

### Stack

Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript strict · Tailwind CSS v4 ·
shadcn/ui (style `base-nova`) · Drizzle ORM 0.45 + `pg` · PostgreSQL 17 ·
bcryptjs cho hash mật khẩu.

Dependency bỏ so với repo cũ: `next-auth`, `@auth/drizzle-adapter`,
`react-day-picker`, `date-fns`, `uuid` (dùng `crypto.randomUUID()`), `calendar.tsx`.
Giữ `bcryptjs`, `drizzle-orm`, `pg`, `lucide-react`, `@base-ui/react`,
`class-variance-authority`, `tailwind-merge`/`clsx` (`cn`), `tw-animate-css`
— đều là dependency của shadcn primitives.

### Cấu trúc thư mục

```
src/
  app/
    layout.tsx                     # root: font, anti-FOUC theme script
    globals.css                    # design tokens (giữ từ bản cũ)
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (app)/layout.tsx               # guard: không có session -> redirect /login
    (app)/page.tsx                 # Overview
    (app)/transactions/page.tsx
    (app)/categories/page.tsx
    (app)/review/page.tsx
    (app)/settings/page.tsx
    api/auth/register|login|logout/route.ts
    api/transactions/route.ts  api/transactions/[id]/route.ts
    api/categories/route.ts    api/categories/[id]/route.ts
    api/budgets/route.ts
    api/settings/route.ts      api/settings/password/route.ts
  components/
    ui/                            # shadcn primitives (vendored, giữ từ bản cũ)
    layout/                        # app-shell, nav, page-header, empty-state, theme-toggle
    auth/                          # login-form, register-form
    money/                         # xem §7
  lib/
    db/index.ts                    # drizzle client
    db/schema.ts                   # nguồn sự thật của DB
    money/*.ts                     # logic tiền thuần (xem §5)
    auth.ts                        # hash/verify password
    session.ts                     # sign/verify cookie, getSession, requireUser
    validate.ts                    # helper validate tay
    format.ts                      # formatMoney/formatDate dùng Intl
    utils.ts                       # cn
scripts/
  seed-demo.ts                     # seed user demo + category + giao dịch + budget
  fix-native-bindings.sh           # giữ từ bản cũ (workaround Windows)
drizzle/                           # migration
docs/                              # SETUP, ARCHITECTURE, DATABASE, API, DEVELOPMENT, ROADMAP
```

### Luồng dữ liệu

Đọc: server page → query Drizzle (scope theo `userId` từ session) → tính summary
bằng `src/lib/money` → truyền plain object xuống client component.
Ghi: client component → `fetch` REST API → API validate + ghi DB → `router.refresh()`
→ server page render lại. Không cache layer, không state library, không optimistic update.

Không có API cho summary/insight: trang Review và Overview tính trực tiếp trên server,
chỉ mutation mới đi qua REST.

### Auth

- Mật khẩu: `bcryptjs` hash cost 10. Không bao giờ log/trả `passwordHash` ra response.
- Đăng nhập: verify → set cookie `session`.
  - Giá trị: `base64url(JSON.stringify({ uid, iat, exp })) + "." + HMAC-SHA256(payload, SESSION_SECRET)`
  - Thuộc tính: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` khi production, `Max-Age` 30 ngày.
  - Verify bằng `crypto.timingSafeEqual`; sai chữ ký/hết hạn → coi như chưa đăng nhập.
- `src/lib/session.ts`:
  - `getSession()` → `{ userId } | null` (đọc cookie, verify, KHÔNG query DB)
  - `requireUser()` → load user từ DB, không có thì `redirect("/login")` (dùng ở `(app)/layout.tsx`)
  - `getUser()` → full user row cho mọi page (currency/locale/name)
- Đăng ký: tạo `users` + bộ category mặc định trong cùng một transaction DB.
- Đổi mật khẩu: nhập mật khẩu hiện tại + mật khẩu mới (≥ 8 ký tự), verify rồi ghi hash mới.
- Không dùng `middleware.ts`; guard nằm ở layout + từng API route.
- Env mới: `SESSION_SECRET` (bắt buộc, ghi vào `.env.example` và `.env.local`).

### Xử lý lỗi

- Mọi API trả lỗi dạng `{ "error": string }` với status phù hợp: 400 (dữ liệu sai),
  401 (chưa đăng nhập), 404 (không tồn tại **hoặc** không thuộc user — không phân biệt),
  409 (trùng/xung đột), 500.
- Response thành công trả object có key tên: `{ transaction }`, `{ categories }`, `{ ok: true }`.
  Tạo mới trả 201.
- Validate ở biên (input người dùng): email, độ dài mật khẩu, `kind` thuộc enum,
  `amount` parse được và > 0, `occurredOn` đúng `YYYY-MM-DD`, `month` đúng `YYYY-MM`,
  `note` ≤ 500 ký tự, `name` category 1–50 ký tự và không trùng trong cùng `(userId, kind)`.
- Mọi query bắt buộc có `userId` từ session; không bao giờ nhận `userId` từ client.

## 4. Dữ liệu

Postgres, 4 bảng + 1 enum. Migration: `drizzle/0000_money_init.sql` sinh từ `schema.ts`
sau khi drop sạch schema cũ.

### enum `category_kind`
`'income' | 'expense'`

### `users`
| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid PK default random | |
| email | varchar(255) not null | unique index `users_email_idx` |
| name | varchar(100) not null | |
| passwordHash | varchar(255) not null | bcrypt |
| currency | varchar(3) not null default `'VND'` | validate `/^[A-Z]{3}$/` |
| locale | varchar(10) not null default `'vi-VN'` | validate `/^[a-z]{2}-[A-Z]{2}$/` |
| createdAt / updatedAt | timestamp not null default now | |

### `categories`
| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid not null → users cascade | |
| name | varchar(50) not null | |
| kind | category_kind not null | |
| color | varchar(7) not null default `'#64748b'` | hex, validate |
| sortOrder | integer not null default 0 | |
| archivedAt | timestamp null | xoá mềm |
| createdAt / updatedAt | timestamp not null | |

Index: `categories_user_idx (userId, kind)`.
Unique: `categories_user_kind_name_idx (userId, kind, name)`.

### `transactions`
| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid not null → users cascade | |
| kind | category_kind not null | trùng với kind của category khi có category |
| categoryId | uuid null → categories `set null` | null = chưa phân loại |
| amountMinor | bigint not null | đơn vị nhỏ nhất của currency |
| currency | varchar(3) not null | snapshot lúc ghi |
| occurredOn | date not null, mode `'string'` | `YYYY-MM-DD` |
| note | varchar(500) null | |
| createdAt / updatedAt | timestamp not null | |

Index: `transactions_user_date_idx (userId, occurredOn)`,
`transactions_user_category_idx (userId, categoryId)`.

Quy ước tiền: lưu **integer minor units**. `VND`, `JPY`, `KRW`, `IDR`, `CLP`, `ISK`
có 0 chữ số thập phân; các currency khác ×100. `currency` lưu trên từng giao dịch để
đổi currency trong Settings không làm hiểu sai số liệu cũ.

### `budgets`
| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid not null → users cascade | |
| categoryId | uuid not null → categories cascade | |
| month | date not null, mode `'string'` | luôn là ngày 01, `YYYY-MM-01` |
| amountMinor | bigint not null | > 0 |
| createdAt / updatedAt | timestamp not null | |

Unique: `budgets_user_category_month_idx (userId, categoryId, month)`.
Chỉ đặt budget cho category `kind = 'expense'`.

### Category mặc định (seed khi đăng ký và trong seed demo)

- Expense: Food & Drinks, Groceries, Transport, Rent, Utilities, Phone & Internet,
  Health, Shopping, Entertainment, Education, Gifts & Donations, Other.
- Income: Salary, Bonus, Freelance, Investment, Other.
- Mỗi category một `color` riêng, `sortOrder` theo thứ tự trên.

## 5. Logic tiền (`src/lib/money/`, pure functions, có test)

Mọi hàm nhận `today`/`month` làm tham số khi liên quan tới thời gian — không đọc
`Date.now()` bên trong — để test được và để tháng hiển thị nhất quán.

### `amount.ts`
- `minorUnitDigits(currency): 0 | 2`
- `parseAmount(input: string, currency: string): number` — trả minor units, ném lỗi khi không parse được
  - Chuẩn hoá: trim, lowercase, bỏ ký hiệu tiền (`₫`, `đ`, `vnd`, `$`, `€`, `,` phân cách nghìn)
  - Hậu tố: `k` = ×10³, `tr` / `m` = ×10⁶ (dùng cho VND: `50k` → 50000, `1,5tr` → 1500000)
  - Currency 0 chữ số thập phân: bỏ mọi dấu `.` `,` ` ` còn lại → số nguyên
  - Currency 2 chữ số thập phân: `/^\d+([.,]\d{1,2})?$/` → major + phần thập phân → ×100
  - Từ chối: rỗng, không phải số, ≤ 0, có dấu âm
- `formatMoney(minor: number, currency: string, locale: string): string` — `Intl.NumberFormat` với `style: 'currency'`, số chữ số thập phân cố định theo `minorUnitDigits`
- `formatCompactMoney(minor, currency, locale): string` — cho nhãn trục/badge, dùng `notation: 'compact'`

### `period.ts`
- `monthKey(date: Date): string` → `YYYY-MM`
- `monthRange(month: string): { start: string; end: string }` → `YYYY-MM-01` … ngày cuối tháng (để query `between`)
- `shiftMonth(month: string, delta: number): string`
- `daysInMonth(month: string): number`
- `daysElapsed(month: string, today: string): number` — tháng hiện tại: số ngày đã qua; tháng khác: `daysInMonth`

### `summary.ts`
```ts
type CategoryTotal = { categoryId: string | null; name: string; totalMinor: number; count: number };
type MonthSummary = {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;            // income - expense
  savingsRate: number;         // net / income, 0 khi income = 0; có thể âm
  byCategory: CategoryTotal[]; // chỉ expense, sort totalMinor desc
  transactionCount: number;
  avgPerDayMinor: number;      // expenseMinor / daysElapsed
};
```
`summarize(transactions, categories)` — nhận mảng giao dịch của 1 tháng; giao dịch
`categoryId = null` gom vào nhóm tên `"Uncategorized"`.

### `compare.ts`
```ts
type CategoryDelta = { categoryId: string | null; name: string; currentMinor: number; previousMinor: number; deltaMinor: number; deltaPct: number | null };
type MonthComparison = {
  current: MonthSummary; previous: MonthSummary;
  expenseDeltaMinor: number; expenseDeltaPct: number | null;
  incomeDeltaMinor: number; incomeDeltaPct: number | null;
  savingsRateDelta: number;
  movers: CategoryDelta[];     // sort |deltaMinor| desc, tối đa 5
};
```
`compareMonths(current, previous)` — `deltaPct = null` khi mẫu số = 0.

### `budget.ts`
- `budgetStatus(spentMinor: number, limitMinor: number)` →
  `{ pct: number; remainingMinor: number; tone: 'ok' | 'warn' | 'over' }`
  - `tone = 'over'` khi `spent > limit`; `'warn'` khi `pct >= 80`; còn lại `'ok'`
  - `limit <= 0` (phòng thủ, validation đã chặn): `spent > 0` → `pct 100`, `tone 'over'`; ngược lại `pct 0`, `tone 'ok'`
- `budgetLines(summary, budgets)` → mảng dòng cho UI, sort `pct` desc, **chỉ gồm category đã đặt budget**. Category chưa đặt budget do trang Categories tự hiển thị (nơi đặt ngân sách).

### `insights.ts`
```ts
type Insight = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  amountMinor?: number;
  categoryId?: string | null;
};
type InsightInput = {
  summary: MonthSummary;        // tháng đang xét
  previous: MonthSummary | null;// tháng liền trước
  budgets: BudgetLine[];        // budget của tháng đang xét
  transactions: TransactionLike[]; // giao dịch 3 tháng: tháng đang xét + 2 tháng trước
  today: string;                // YYYY-MM-DD, để rule `pace` biết đang ở ngày nào
};
buildInsights(input): Insight[]
```
8 rule (đều deterministic, tiếng Anh cho UI):

1. `savings-rate` — có income: `critical` nếu `savingsRate < 0`, `warning` nếu `< 0.2`, còn lại `info`. Detail nêu % và chênh lệch so tháng trước (nếu có).
2. `budget-over` — mỗi budget `tone = 'over'` → `critical`, "Over budget by …". Sort `pct` desc, tối đa 3.
3. `budget-warn` — mỗi budget `tone = 'warn'` → `warning`, "…% of budget used". Tối đa 3.
4. `category-spike` — mover có `deltaMinor > 0` và `deltaPct >= 30%` và `deltaMinor >= 10%` tổng chi tháng này → `warning`. Tối đa 2.
5. `top-category` — category expense lớn nhất, chỉ khi chiếm `>= 30%` tổng chi → `info`.
6. `commitments` — category expense có giao dịch trong **cả 3 tháng** (tháng này + 2 tháng trước) → `info`, amount = trung bình tổng 3 tháng, detail "≈ …/month".
7. `pace` — chỉ với tháng hiện tại, `daysElapsed >= 5`: so chi tới cùng kỳ mấy ngày với tháng trước; chênh `>= 15%` → `warning` (chi nhanh hơn) hoặc `info` (chi chậm hơn).
8. `outlier` — giao dịch chi có `amountMinor >= 3×` median của category đó trong tháng, `>= 5%` tổng chi tháng, và category có `>= 3` giao dịch → `warning`.

Sort cuối: `critical` → `warning` → `info`, trong cùng mức sort `amountMinor` desc.
Overview hiển thị 3 insight đầu; Review hiển thị tất cả.

## 6. API

Đọc dữ liệu (Overview, Transactions, Categories, Review) do **server page query trực tiếp**
qua Drizzle rồi truyền props xuống client component — không có GET endpoint nào, tránh
trùng lặp logic truy vấn. API chỉ gồm mutation + auth dưới đây.
Tất cả route tự lấy session; không có session → 401. Không route nào nhận `userId` từ client.

| Method + path | Body / query | Trả về | Lỗi |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email, name, password }` | 201 `{ user }` + set cookie | 400, 409 email tồn tại |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user }` + set cookie | 401 sai thông tin (message chung) |
| `POST /api/auth/logout` | – | 200 `{ ok: true }` + xoá cookie | – |
| `POST /api/transactions` | `{ kind, categoryId?, amount (string thô), occurredOn, note? }` | 201 `{ transaction }` | 400 amount/ngày sai, 400 kind lệch category, 404 category không thuộc user |
| `PATCH /api/transactions/[id]` | tập con của body trên | 200 `{ transaction }` | 400, 404 |
| `DELETE /api/transactions/[id]` | – | 200 `{ ok: true }` | 404 |
| `POST /api/categories` | `{ name, kind, color? }` | 201 `{ category }` | 400, 409 trùng tên |
| `PATCH /api/categories/[id]` | `{ name?, color?, sortOrder?, archived? }` | 200 `{ category }` | 400 (gồm gửi `kind`), 404, 409 |
| `DELETE /api/categories/[id]` | – | 200 `{ ok: true }` | 404, 409 còn giao dịch (gợi ý archive) |
| `PUT /api/budgets` | `{ month, entries: [{ categoryId, amount: string \| null }] }` | 200 `{ budgets }` | 400, 404 |
| `PATCH /api/settings` | `{ name?, currency?, locale? }` | 200 `{ user }` | 400; 409 đổi `currency` khi đã có giao dịch |
| `POST /api/settings/password` | `{ current, next }` | 200 `{ ok: true }` | 400, 401 sai mật khẩu hiện tại |

Ghi chú:
- `amount` gửi lên là **chuỗi thô** người dùng gõ; server parse bằng `parseAmount` để
  chỉ có một nơi hiểu định dạng tiền. Client hiển thị lỗi 400 trả về.
- `PUT /api/budgets` là bulk upsert: `amount` null/rỗng → xoá budget dòng đó.
  Chạy trong 1 transaction DB.
- Xoá category khi còn giao dịch → 409 kèm message hướng dẫn archive (giữ lịch sử).
- `PATCH` không cho đổi `kind` của category (sẽ làm lệch giao dịch cũ) → 400 nếu gửi lên.

## 7. UI

### Điều hướng
`Overview` (`/`) · `Transactions` · `Categories` · `Review` · `Settings`.
Desktop: sidebar. Mobile: drawer (giữ pattern `Sheet` của bản cũ).

### `/` Overview
- 4 số: Income, Expenses, Net, Savings rate (tháng hiện tại), `tabular-nums`.
- Thanh tiến độ budget: tối đa 4 dòng có `pct` cao nhất, kèm `tone`.
- Insights: 3 insight đầu.
- Recent transactions: 5 giao dịch gần nhất + link "View all".
- Nút `Add` (dialog) ở header — dùng lại `transaction-form-dialog`.
- Tháng trước/tháng sau để xem tháng khác (`?month=YYYY-MM`).

### `/transactions`
- Chuyển tháng (`?month=`), filter kind / category / tìm trong note (`?q=`).
- Danh sách nhóm theo ngày, mỗi ngày có tổng chi trong ngày; dòng giao dịch hiện
  category (chip màu), note, số tiền (xanh cho income, mặc định cho expense).
- Add / Edit (dialog) / Delete (confirm dialog).
- Form: phân loại Income/Expense (segmented) → lọc category theo kind → gợi ý
  category dựa trên note đã gõ nếu note từng được phân loại trước đó (khớp chính xác,
  sau khi chuẩn hoá khoảng trắng + chữ thường).
- Empty state khi tháng chưa có giao dịch.

### `/categories`
- Hai cột: Income và Expense.
- Mỗi dòng: chấm màu, tên, số giao dịch trong tháng hiện tại, tổng chi tháng này,
  input đặt budget cho tháng hiện tại (lưu ngay khi blur bằng `PUT /api/budgets`).
- Thêm category (dialog), sửa tên/màu, archive/restore, xoá (chặn nếu còn giao dịch).
- Category đã archive ẩn khỏi picker nhưng vẫn hiện trong lịch sử.

### `/review`
- Chọn tháng (`?month=`), mặc định tháng hiện tại.
- Tổng quan: income, expense, net, savings rate + chênh lệch so tháng trước.
- Breakdown theo category: bar ngang bằng `div` (không thêm chart lib), % tỷ trọng, số tiền.
- So sánh tháng trước: bảng top movers (5 dòng) với delta và %.
- Budget vs actual: mỗi dòng có limit, spent, còn lại, `pct`, `tone`.
- Insights: toàn bộ danh sách cho tháng đó.
- Nút chuyển nhanh tháng trước / tháng sau.

### `/settings`
- Tên hiển thị, currency (select các mã thông dụng + input tự do; **khoá lại kèm ghi chú
  khi đã có giao dịch**), locale.
- Đổi mật khẩu.
- Hiển thị email (không sửa được trong v1).

### Quy tắc trình bày
- UI strings tiếng Anh; ngày theo `locale` của user (mặc định `vi-VN`).
- Tiền format bằng `Intl.NumberFormat` với `currency` của user.
- Mọi con số dùng `tabular-nums`.
- Màu ngữ nghĩa: income = `success`, expense = mặc định, vượt budget = `critical`/`warning`
  qua `status-badge.tsx` — không hard-code màu.
- Giữ design tokens "Calm Ops Console" (`globals.css`), dark mode theo script chống FOUC.
- Mọi trang dùng `PageHeader`, `space-y-6`, `Card`, `EmptyState`; mọi trang có
  loading/error/not-found ở cấp `(app)`.

## 8. Testing & verify

### Unit test (`node --experimental-strip-types --test`, colocate `*.test.ts`)
- `amount.test.ts` — parse VND (`50000`, `50.000`, `50k`, `1,5tr`), parse USD (`12.50`,
  `1,234.56`), từ chối rỗng/0/âm/chữ; format VND và USD theo locale.
- `period.test.ts` — monthKey, monthRange (tháng 28/30/31 ngày, tháng 2), shiftMonth
  (qua năm), daysElapsed cho tháng hiện tại và tháng cũ.
- `summary.test.ts` — tổng thu/chi/net, savings rate (có/không income, net âm),
  nhóm Uncategorized, sort byCategory.
- `compare.test.ts` — delta và `deltaPct = null` khi tháng trước = 0, movers giới hạn 5 và sort.
- `budget.test.ts` — ranh giới `pct` 79/80/100/101, remaining, limit 0.
- `insights.test.ts` — mỗi rule 1 ca dương + 1 ca âm, thứ tự sort, giới hạn số lượng.

### Gate trước khi coi là xong
- `npm test` xanh · `npm run lint` 0 error · `npx tsc --noEmit` sạch · `npm run build` xanh.
- `npm run db:migrate` chạy sạch trên DB đã reset · `npm run db:seed` chạy sạch.
- Kiểm tra tay bằng browser: đăng nhập user demo → thêm giao dịch thu/chi → sửa → xoá →
  đặt budget → xem Review đổi số theo → đổi currency ở Settings → đăng xuất/đăng nhập lại.

### Demo
`scripts/seed-demo.ts` tạo user `demo@money.local` / mật khẩu `money1234`, currency VND,
locale vi-VN, bộ category mặc định, **6 tháng** giao dịch VND (có tháng chi nhiều hơn thu
để insight bắt được case xấu), budget cho tháng hiện tại. Script in ra thông tin đăng nhập
khi chạy. Dev server để chạy nền cho user tự click.

## 9. Dọn repo

### Xoá
Toàn bộ code life-admin: `src/app/(dashboard)` và các page inbox/life/deadlines/tasks/ai,
`src/app/api/*` cũ, `src/components/{inbox,entities,deadlines,tasks,ai,home,settings,auth}`,
`src/lib/{audit,policy-engine,storage,deadline-urgency*,ai}`, `src/lib/auth.ts` cũ,
`src/lib/session.ts` cũ, `src/types/*` cũ, `drizzle/*` cũ, `docs/*` cũ (trừ spec này),
`uploads/*`, `scripts/seed-demo.ts` cũ, `NATIVE-BINDINGS.md`, `next-env.d.ts` cũ,
`tsconfig.tsbuildinfo`. Ngoài ra drop toàn bộ bảng cũ trong Postgres.

### Giữ (hạ tầng/môi trường, không gõ lại)
`.git` + lịch sử · `.commandcode/` (local, thêm vào `.gitignore`, không commit) ·
`.env.local` (thêm `SESSION_SECRET`, bỏ biến chỉ NextAuth dùng) · `next.config.ts` ·
`tsconfig.json` · `postcss.config.js` · `eslint.config.mjs` · `components.json` ·
`scripts/fix-native-bindings.sh` + các optional dep pin cho Linux/Windows ·
`src/app/globals.css` (design tokens) · `src/components/ui/*` (shadcn vendored, bỏ
`calendar.tsx`) · `src/lib/utils.ts`.

Lý do: đây là config môi trường và thư viện vendored, không phải code nghiệp vụ;
gõ lại y hệt không tạo thêm giá trị.

### Git
Chia commit theo lớp; commit đầu tiên gộp "xoá code cũ + scaffold + auth chạy được"
để repo luôn build được từ đó về sau:

1. `chore!: reset repo and scaffold personal money app` — xoá life-admin, cấu hình mới,
   schema 4 bảng + migration `0000`, auth + session, login/register, app shell.
2. `feat(money): pure money logic with tests` — `src/lib/money/*` + test.
3. `feat(api): transactions, categories, budgets, settings endpoints`.
4. `feat(ui): overview, transactions, categories, review pages`.
5. `chore: demo seed and docs`.

Không commit `.commandcode/`, `.env.local`, `uploads/`.

## 10. Rủi ro & giới hạn

- **Mất data cũ**: reset DB xoá sạch bảng cũ. Đã xác nhận, chỉ là data demo.
- **Insight là rule-based**, không AI. Đúng yêu cầu (AI để khi user gọi). Ngưỡng rule
  là heuristic, có thể chỉnh trong `insights.ts` — không cần migration.
- **Đổi currency không quy đổi**: giao dịch giữ `currency` lúc ghi, và các con số tổng
  cộng theo `amountMinor` không phân biệt currency — nên nếu đổi currency giữa chừng thì
  tổng của tháng sẽ trộn hai đơn vị. Vì vậy `PATCH /api/settings` **chặn đổi `currency`
  khi user đã có giao dịch** (409 + hướng dẫn). Đối lại: người dùng đã ghi dữ liệu bằng
  VND thì không đổi sang USD nửa vời được — muốn đổi phải xoá dữ liệu. Đây là lựa chọn
  có chủ ý để không bao giờ hiển thị số sai.
- **Chưa có import**: mọi giao dịch nhập tay. Nhập nhiều tháng đầu sẽ tốn công.
- **Single-user, không chia sẻ**: nhiều người dùng phải làm lại phần auth + thêm `userId`
  vào mọi truy vấn (đã có sẵn `userId` từ đầu nên chỉ cần bỏ giới hạn 1 user).
- **Không có backup tự động**: dựa vào hướng dẫn `pg_dump` trong docs.

## 11. Việc để sau (ROADMAP)

Ví/tài khoản + số dư · giao dịch định kỳ · import CSV · chụp hoá đơn (cần AI, chỉ làm khi
được yêu cầu) · biểu đồ xu hướng nhiều tháng · xuất dữ liệu · nhắc nhở qua email ·
nhiều người dùng/chia sẻ · đa tiền tệ có tỷ giá · test E2E tự động.
