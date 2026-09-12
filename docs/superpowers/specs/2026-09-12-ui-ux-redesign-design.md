# Spec — UI/UX Redesign: Calm Ops Console

**Ngày:** 2026-09-12
**Trạng thái:** Chờ user review
**Phân loại (brainstorming):** Architectural — thay design token mà mọi component phụ thuộc, tái
cấu trúc app shell. Tổng cộng **40 file**: sửa 32, xóa 1, tạo 7.

---

## 1. Bối cảnh

`Life Admin OS` (Next.js 16.3.4 App Router + React 19 + Tailwind v4 + shadcn `base-nova` +
PostgreSQL/Drizzle) là hệ quản trị đời sống cá nhân. Nguyên tắc sản phẩm
(`docs/SPEC.md`): *Remember → Understand → Recommend → Act*, mục tiêu là **giảm lo lắng**
khi quản lý giấy tờ, deadline, subscription.

Giao diện hiện tại được dựng nhanh qua 4 phase và tích tụ các lỗi nền tảng. Audit ngày
2026-09-12 tìm thấy các defect dưới đây trong code đang chạy.

### 1.1 Defect đã xác minh

| # | Vấn đề | Bằng chứng |
|---|--------|-----------|
| D1 | Font Geist không bao giờ được áp dụng | `globals.css` khai `@theme inline { --font-sans: var(--font-sans); }` — tự tham chiếu; `layout.tsx` chỉ set `--font-geist-sans`, không có chỗ nào gán `--font-sans`. `html { @apply font-sans }` resolve về rỗng → browser default font. |
| D2 | 12 entity type dùng emoji làm icon | `types/index.ts` → `ENTITY_TYPE_CONFIG[t].icon = "📦"`. Render ở `entity-list`, `entity-tabs`, `entity-create-dialog`, `inbox-upload`, `entity-relations-manager`, `deadline-list`, `life/page.tsx`, `life/[type]/[id]/page.tsx` (cỡ `text-4xl`). Emoji phụ thuộc font hệ điều hành, không theme được, không đổi được size/stroke. |
| D3 | Màu hardcode thay vì semantic token | `priority-actions.tsx` (`border-green-200 bg-green-50 text-green-800`, `bg-white/60`), `score-card.tsx` (`text-green-500/yellow-500/red-500`), `deadline-list.tsx` (`border-orange-300 bg-orange-50`, `border-yellow-300 bg-yellow-50`), `inbox-upload.tsx` (`border-yellow-400 bg-yellow-50`, `text-green-600`), `inbox-items.tsx`, `task-list.tsx` (`bg-red-500/orange-500/yellow-500/green-500/gray-500`). `bg-white/60` sai hẳn trên nền tối. |
| D4 | Dark mode là code chết | `globals.css` có `.dark { … }` + `@custom-variant dark`, `src/components/ui/*` có nhiều class `dark:`, nhưng **không có** `ThemeProvider`, không `next-themes`, không toggle, `html` không bao giờ nhận class `dark`. |
| D5 | Mobile nav cụt | `navigation.tsx` → `navigation.slice(0, 5)`. `/ai` và `/settings` **không thể truy cập** trên mobile. Không có `env(safe-area-inset-bottom)`. |
| D6 | `EntityTabs` hỏng và entity không truy cập được | `entity-tabs.tsx` render `TabsList` 13 trigger nhưng **không có `TabsContent`** → bấm không đổi gì. Đồng thời `life/page.tsx` render `items.slice(0, 5)` → entity thứ 6 trở đi của mỗi type **không có đường nào tới**. |
| D7 | Không có route-level state | Không tồn tại `loading.tsx` / `error.tsx` / `not-found.tsx` trong `src/app/**`. Mọi page `await` DB (`requireAuth` → `db.query…`) nên điều hướng đứng hình không phản hồi; lỗi runtime rơi vào màn hình trắng mặc định của Next. |
| D8 | Settings là UI giả | `settings/page.tsx` có 4 `<input type="checkbox">` trần (không `Label`, không state, không `aria`) và nút `Save Changes` **không có handler**. Ghi nhận sẵn ở `docs/DEVELOPMENT.md` §7. |
| D9 | Auth form thiếu `autoComplete` | `login-form.tsx` / `register-form.tsx` không có `autoComplete` → password manager không hoạt động. `register-form` redirect `/login?registered=true` nhưng `login/page.tsx` **không đọc** param → không có xác nhận nào. |
| D10 | `Date.now()` trong render | `upcoming-deadlines.tsx`, `priority-actions.tsx`, `deadline-list.tsx`, `life/[type]/[id]/page.tsx` tính `daysUntil` bằng `Date.now()` ngay trong thân render → kết quả khác nhau giữa server và client, nguy cơ hydration mismatch. |
| D11 | a11y gaps | Icon-only button thiếu `aria-label` (`MoreHorizontal` ở `deadline-list.tsx`, `task-list.tsx`, `entity-actions.tsx`). Icon cạnh text không `aria-hidden`. `CardTitle` render `<div>` (`ui/card.tsx`) → không có heading thật trong card. `--ring: oklch(0.708 0 0)` quá nhạt để thấy focus. |
| D12 | Chuỗi hardcode lặp | Khối `<h1 className="text-3xl font-bold tracking-tight">` + `<p className="text-muted-foreground">` lặp ở 8 page; `<p className="py-12 text-center text-muted-foreground">` lặp ở 6 chỗ. `inbox/page.tsx` dùng "Life Admin Inbox" trong khi nav ghi "Inbox". |
| D13 | `h-screen` trên mobile | `(dashboard)/layout.tsx` dùng `h-screen`; thanh URL động trên mobile làm sai chiều cao. |

---

## 2. Hướng đã chốt

| Quyết định | Lựa chọn | Lý do |
|-----------|----------|-------|
| Hướng thị giác | **Calm Ops Console** | Nền neutral, một accent duy nhất, màu chỉ dành cho tín hiệu khẩn cấp — khớp mục tiêu "giảm lo lắng" và mở rộng được cho Phase 5–6 (Weekly Brief, search). |
| Dark mode | **Làm thật, không thêm dependency** | Inline script 8 dòng + class trên `<html>` + `localStorage`. Tránh `next-themes` (~3KB) cho việc viết được bằng 12 dòng. |
| Phạm vi | **Approach 1 — Design-system sweep** | Sửa đúng những gì đang hỏng thật; không tự bịa feature. |
| `EntityTabs` | **Xóa** | Grid ở `life/page.tsx` đã nhóm theo type kèm số đếm → tabs thừa. Xóa kèm `items.slice(0, 5)` để mọi entity truy cập được. |
| Ngôn ngữ UI | **Giữ tiếng Anh** | Không đụng chuỗi hiển thị. `lang="en"` giữ nguyên. |

**Bối cảnh công cụ:** Python không có trên máy này nên không chạy được script tra cứu của skill
`ui-ux-pro-max`; palette dưới đây là kết quả đối chiếu Quick Reference của skill + tính toán
contrast thủ công. Không cài Python (theo quy tắc của skill).

---

## 3. Design tokens

Toàn bộ nằm trong `src/app/globals.css`. **Giữ nguyên tên biến shadcn hiện có** để
`src/components/ui/*` không phải sửa (convention dự án: *"đừng sửa tay — dùng `npx shadcn add`"*).

### 3.1 Sửa lỗi font (D1)

```css
@theme inline {
  --font-sans: var(--font-geist-sans);      /* sửa: hết tự tham chiếu */
  --font-heading: var(--font-geist-sans);   /* sửa */
  --font-mono: var(--font-geist-mono);      /* giữ */
}
```

### 3.2 Token ngữ nghĩa mới

Thêm cả khối `@theme inline` (để Tailwind sinh utility) **và** giá trị trong `:root` / `.dark`:

```css
@theme inline {
  --color-success: var(--success);
  --color-success-muted: var(--success-muted);
  --color-success-muted-foreground: var(--success-muted-foreground);
  --color-warning: var(--warning);
  --color-warning-muted: var(--warning-muted);
  --color-warning-muted-foreground: var(--warning-muted-foreground);
  --color-info: var(--info);
  --color-info-muted: var(--info-muted);
  --color-info-muted-foreground: var(--info-muted-foreground);
}
```

Sinh ra được các utility `bg-success-muted`, `text-success-muted-foreground`,
`border-warning-muted`, …

### 3.3 Light theme (`:root`)

```css
--background: oklch(0.99 0 0);
--foreground: oklch(0.18 0 0);
--card: oklch(1 0 0);
--card-foreground: oklch(0.18 0 0);
--popover: oklch(1 0 0);
--popover-foreground: oklch(0.18 0 0);
--primary: oklch(0.45 0.11 245);
--primary-foreground: oklch(0.99 0 0);
--secondary: oklch(0.965 0 0);
--secondary-foreground: oklch(0.25 0 0);
--muted: oklch(0.965 0 0);
--muted-foreground: oklch(0.52 0 0);
--accent: oklch(0.965 0 0);
--accent-foreground: oklch(0.25 0 0);
--destructive: oklch(0.55 0.19 25);
--border: oklch(0.92 0 0);
--input: oklch(0.92 0 0);
--ring: oklch(0.45 0.11 245);
--radius: 0.625rem;

--success: oklch(0.55 0.13 155);
--success-muted: oklch(0.96 0.02 155);
--success-muted-foreground: oklch(0.40 0.10 155);
--warning: oklch(0.62 0.13 70);
--warning-muted: oklch(0.97 0.03 80);
--warning-muted-foreground: oklch(0.42 0.09 70);
--info: oklch(0.55 0.10 245);
--info-muted: oklch(0.96 0.02 245);
--info-muted-foreground: oklch(0.40 0.09 245);

--sidebar: oklch(0.985 0 0);
--sidebar-foreground: oklch(0.18 0 0);
--sidebar-primary: oklch(0.45 0.11 245);
--sidebar-primary-foreground: oklch(0.99 0 0);
--sidebar-accent: oklch(0.965 0 0);
--sidebar-accent-foreground: oklch(0.25 0 0);
--sidebar-border: oklch(0.92 0 0);
--sidebar-ring: oklch(0.45 0.11 245);
```

### 3.4 Dark theme (`.dark`)

```css
--background: oklch(0.16 0 0);
--foreground: oklch(0.96 0 0);
--card: oklch(0.20 0 0);
--card-foreground: oklch(0.96 0 0);
--popover: oklch(0.22 0 0);
--popover-foreground: oklch(0.96 0 0);
--primary: oklch(0.68 0.12 245);
--primary-foreground: oklch(0.16 0 0);
--secondary: oklch(0.26 0 0);
--secondary-foreground: oklch(0.96 0 0);
--muted: oklch(0.26 0 0);
--muted-foreground: oklch(0.70 0 0);
--accent: oklch(0.26 0 0);
--accent-foreground: oklch(0.96 0 0);
--destructive: oklch(0.62 0.17 25);
--border: oklch(1 0 0 / 12%);
--input: oklch(1 0 0 / 15%);
--ring: oklch(0.68 0.12 245);

--success: oklch(0.70 0.13 155);
--success-muted: oklch(0.26 0.04 155);
--success-muted-foreground: oklch(0.82 0.10 155);
--warning: oklch(0.75 0.13 80);
--warning-muted: oklch(0.27 0.04 80);
--warning-muted-foreground: oklch(0.85 0.10 80);
--info: oklch(0.70 0.10 245);
--info-muted: oklch(0.26 0.04 245);
--info-muted-foreground: oklch(0.82 0.09 245);

--sidebar: oklch(0.18 0 0);
--sidebar-foreground: oklch(0.96 0 0);
--sidebar-primary: oklch(0.68 0.12 245);
--sidebar-primary-foreground: oklch(0.16 0 0);
--sidebar-accent: oklch(0.26 0 0);
--sidebar-accent-foreground: oklch(0.96 0 0);
--sidebar-border: oklch(1 0 0 / 12%);
--sidebar-ring: oklch(0.68 0.12 245);
```

### 3.5 Ràng buộc contrast

Bảng dưới là **ước lượng** từ chuyển đổi OKLCH → sRGB (đối chiếu giá trị đã biết của thang
`neutral-*` / `red-*` trong Tailwind v4). **Không phải số đo.** Khi triển khai phải xác minh lại
bằng DevTools hoặc script contrast — mục §11 mục 7 là bắt buộc, không được bỏ qua.

| Cặp | Light | Dark | Ngưỡng |
|-----|-------|------|--------|
| `muted-foreground` trên `background` | >4.5:1 | >7:1 | ≥4.5:1 (text thường) |
| `destructive` như **text** trên `background` | >5:1 | >4.5:1 | ≥4.5:1 |
| `primary` như **text** trên `background` | >7:1 | >6:1 | ≥4.5:1 |
| `*-muted-foreground` trên `*-muted` | >4.5:1 | >4.5:1 | ≥4.5:1 |
| `foreground` trên `background` | >15:1 | >14:1 | ≥4.5:1 |

**Quy tắc bắt buộc:** `--success` và `--warning` **không** được dùng làm nền đặc với chữ trắng
(amber chữ trắng không đạt AA). Badge/khối trạng thái luôn dùng cặp
`*-muted` (nền) + `*-muted-foreground` (chữ). Chỉ `--destructive` được phép nổi.

### 3.6 Không đổi

`--radius` giữ `0.625rem`; card padding `--card-spacing` giữ 16px; section gap giữ `space-y-6`
(24px); card đã dùng `ring-1 ring-foreground/10` — đúng hướng "ring thay shadow", không cần đổi.
Số liệu dùng utility `tabular-nums` có sẵn của Tailwind, không thêm token.

`--chart-*` **giữ nguyên** (đang là thang xám) — app chưa có chart nào; đổi bây giờ là làm cho
một yêu cầu giả định (Phase 5 mới có Weekly Brief).

---

## 4. App shell

### 4.1 `src/app/layout.tsx`

- Thêm `<script>` inline chặn FOUC, đặt trước mọi nội dung trong `<head>`, đọc `localStorage.theme`,
  fallback `prefers-color-scheme`, gán class `dark` lên `documentElement`. Bọc `try/catch` (Safari private mode).
- Thêm `suppressHydrationWarning` trên `<html>` (bắt buộc, vì server không biết theme).
- Giữ `Geist` / `Geist_Mono` với `variable: "--font-geist-sans"` / `"--font-geist-mono"`.

### 4.2 `src/app/(dashboard)/layout.tsx`

- `h-screen` → `h-dvh` (D13).
- `main` thêm `overscroll-contain`.
- Padding bottom cho mobile nav giữ, nhưng dùng biến thể có safe-area.

### 4.3 `src/components/layout/navigation.tsx`

Sidebar chia **3 nhóm** thay vì 7 mục phẳng:

```
Capture   Inbox
Track     Life · Deadlines · Tasks
Assist    AI · Settings
```

- Nhãn nhóm: `text-xs uppercase tracking-wide text-muted-foreground`, có `aria-label` trên `<nav>`.
- **Trạng thái active**: bỏ `bg-primary text-primary-foreground` (khối đặc) → `bg-muted text-foreground`
  + thanh chỉ báo `absolute left-0 w-0.5 h-4 bg-primary`. Lý do: 7 mục phẳng cùng tô đặc thì
  không còn "calm"; giữ `--primary` cho đúng một tín hiệu.
- Chân sidebar: `<ThemeToggle />`.
- `MobileNav`: bỏ `slice(0, 5)`. Còn **4 mục chính** (Home, Inbox, Life, Tasks) + nút **More** mở
  `Sheet` (đã có sẵn trong `ui/sheet.tsx`) chứa toàn bộ 7 destination + ThemeToggle.
  Thêm `pb-[env(safe-area-inset-bottom)]`; mỗi mục đạt hit area ≥44px (`min-h-11`).

---

## 5. Icon system (D2)

`src/types/index.ts` — `ENTITY_TYPE_CONFIG` đổi `icon: string` → `icon: LucideIcon`:

```ts
import type { LucideIcon } from "lucide-react";

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

Field `color` giữ nguyên (chưa nơi nào đọc — không mở rộng phạm vi).

**Call-site phải đổi** từ `<span>{config.icon}</span>` sang `<config.icon className="h-4 w-4" />`:

- `src/components/entities/entity-list.tsx`
- `src/components/entities/entity-create-dialog.tsx`
- `src/components/entities/entity-relations-manager.tsx`
- `src/components/deadlines/deadline-list.tsx`
- `src/components/inbox/inbox-upload.tsx`
- `src/app/(dashboard)/life/page.tsx`
- `src/app/(dashboard)/life/[type]/[id]/page.tsx` (hiện là emoji `text-4xl`)
- `src/components/entities/entity-tabs.tsx` — **file bị xóa**, không tính

Size icon: **không truyền class size ở những chỗ primitive tự lo.** `ui/select.tsx` dòng 119
(`SelectItem`) đã có `[&_svg:not([class*='size-'])]:size-4`, nên `<config.icon />` trần là đủ.
Ở chỗ primitive không tự lo (list, heading, đoạn văn) thì truyền class tường minh.

Trong `SelectItem`, bọc nhãn bằng `<span>` để khớp rule `*:[span]:last:flex` của chính primitive:

```tsx
<SelectItem key={t} value={t}>
  <config.icon />
  <span>{ENTITY_TYPE_CONFIG[t].label}</span>
</SelectItem>
```

Lưu ý `<config.icon />` chỉ hợp lệ khi biến đã ở dạng viết hoa; nếu destructure thì phải gán ra
biến có chữ đầu hoa (`const Icon = ENTITY_TYPE_CONFIG[t].icon`).

---

## 6. Shared primitives (4 file mới)

Chỉ tạo những cái có call-site thật. Không làm thư viện chung.

| File | Vì sao | Call-site |
|------|--------|-----------|
| `src/components/layout/page-header.tsx` | Gom khối `h1 text-3xl font-bold tracking-tight` + `p text-muted-foreground` lặp 8 chỗ; có slot `action` để bỏ `flex justify-between` tự chế | 8 page |
| `src/components/layout/empty-state.tsx` | Gom `<p className="py-12 text-center text-muted-foreground">` lặp 6 chỗ; thêm icon + slot action | 6 chỗ |
| `src/components/layout/theme-toggle.tsx` | Nút Sun/Moon, đọc/ghi `localStorage`, có `aria-label` | Sidebar + MobileNav sheet |
| `src/components/status-badge.tsx` | **Điểm duy nhất** ánh xạ trạng thái → token màu; thay 7 chỗ đang tự chế màu: `inbox-items` (4 status), `deadline-list` (urgency), `task-list` (priority + status), `score-card` (score band), `upcoming-deadlines` (days), `priority-actions` (priority), `life/[type]/[id]` (days) | 7 chỗ |

`empty-state.tsx` thay luôn chuỗi `"Loading..."` ở `inbox-items.tsx` bằng `<Skeleton>`
(component đã có trong `ui/` nhưng chưa dùng ở đâu).

`PageHeader` render `<h1>`. Heading thật bên trong card **không** thuộc phạm vi — lý do ở §9.1.

---

## 7. Route states (D7)

Thêm 3 file trong `src/app/(dashboard)/`:

- `loading.tsx` — skeleton theo bố cục chung (page header + vài card), dùng `ui/skeleton.tsx`.
- `error.tsx` — `"use client"`, nhận `{ error, reset }`, hiển thị thông báo + nút `Try again`
  gọi `reset()`. Không lộ stack trace ra UI.
- `not-found.tsx` — thông báo + link về `/`.

---

## 8. Sửa defect còn lại

| # | Cách sửa |
|---|----------|
| D3 | Quét toàn bộ màu hardcode → token ngữ nghĩa qua `StatusBadge`. Đặc biệt `bg-white/60` ở `priority-actions.tsx` → `bg-background/60`. |
| D4 | Toggle hoạt động; kiểm cả 2 theme trước khi xong. |
| D6 | Xóa `src/components/entities/entity-tabs.tsx`; xóa `items.slice(0, 5)` trong `life/page.tsx`; bỏ import `Tabs` không dùng. |
| D8 | `Checkbox` + `Label` (đã có trong `ui/`), có `id`/`htmlFor`; nút `Save Changes` **disable** kèm ghi chú "Not wired up yet" thay vì giả vờ hoạt động. |
| D9 | `autoComplete`: `email`, `current-password`, `new-password`, `name`. `login/page.tsx` đọc `searchParams.registered` và render thông báo thành công. |
| D10 | Tính `daysUntil` **một lần** bằng `useMemo` với mốc "hôm nay" ổn định (`new Date()` set `00:00`), không gọi `Date.now()` trong thân render. Áp dụng cho `upcoming-deadlines.tsx`, `priority-actions.tsx`, `deadline-list.tsx`, `life/[type]/[id]/page.tsx`. |
| D11 | `aria-label` cho mọi icon-only button; `aria-hidden` cho icon trang trí cạnh text; `--ring` đã đổi sang primary. Phần `CardTitle` **không sửa** — xem §9.1. |
| D12 | Dùng `PageHeader`; `inbox/page.tsx` đổi "Life Admin Inbox" → "Inbox" cho khớp nav. |

---

## 9. Ngoài phạm vi

### 9.1 Giới hạn có chủ ý: heading trong card

`ui/card.tsx` render `CardTitle` bằng `<div>` cứng (không nhận `render`, không nhận `asChild`).
Convention dự án (`docs/DEVELOPMENT.md` §6) cấm sửa tay `src/components/ui/*` — chỉ được thêm qua
`npx shadcn add`.

Hệ quả: **card title không phải heading thật trong accessibility tree.** Cách duy nhất để sửa mà
không vi phạm convention là bọc `<h2>` thủ công bên trong `CardTitle` ở từng call-site (~15 chỗ),
kèm reset lại `font-size`/`font-weight` mà browser áp cho heading — lặp lại, dễ lệch, và lợi ích
nhỏ so với chi phí. Nên tôi **cố ý không làm**.

Điều này chấp nhận được vì heading đã đúng ở những chỗ quan trọng nhất:
- `PageHeader` render `<h1>` cho mọi page (8 chỗ) — đây là mục tiêu chính của screen-reader navigation.
- Nhóm deadline (`deadline-list.tsx`) và nhóm entity type (`life/page.tsx`) đã render `<h2>` thật.
- `<dt>`/`<dd>` ở `life/[type]/[id]/page.tsx` đã đúng semantics.

Nếu sau này muốn sửa gốc: chạy `npx shadcn add card` để lấy bản registry mới, hoặc mở issue với
shadcn cho `CardTitle` nhận prop `render`.

### 9.2 Các mục khác

- Không thêm dependency.
- Không sửa `src/components/ui/*` (convention dự án: dùng `npx shadcn add`).
- Không đổi API route, schema Drizzle, hay logic nghiệp vụ.
- Không dịch chuỗi hiển thị; giữ `lang="en"`; giữ `toLocaleDateString("en-US")`.
- Không thêm search / command palette / tái cấu trúc IA (Approach 2, đã bị loại).
- Không đổi `--chart-*`.
- Không commit (repo đang có thay đổi chưa commit sẵn ở `README.md`, `deadline-list.tsx`,
  `src/lib/ai/provider.ts`, … — người dùng tự quyết định gom commit).

---

## 10. File bị chạm

**Sửa (32):** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`,
`src/app/(dashboard)/{page,inbox/page,life/page,deadlines/page,tasks/page,ai/page,settings/page}.tsx`,
`src/app/(dashboard)/life/[type]/[id]/page.tsx`, `src/app/(auth)/login/page.tsx`,
`src/app/(auth)/register/page.tsx`, `src/components/layout/navigation.tsx`,
`src/components/auth/{login-form,register-form}.tsx`, `src/components/home/{score-card,upcoming-deadlines,priority-actions,quick-stats}.tsx`,
`src/components/inbox/{inbox-upload,inbox-items}.tsx`, `src/components/deadlines/deadline-list.tsx`,
`src/components/tasks/{task-list,task-create-dialog}.tsx`,
`src/components/entities/{entity-list,entity-create-dialog,entity-actions,entity-relations-manager,entity-attributes-editor}.tsx`,
`src/components/ai/ai-chat.tsx`, `src/types/index.ts`

**Xóa (1):** `src/components/entities/entity-tabs.tsx`

**Tạo (7):** `src/components/layout/{page-header,empty-state,theme-toggle}.tsx`,
`src/components/status-badge.tsx`,
`src/app/(dashboard)/{loading,error,not-found}.tsx`

---

## 11. Kiểm chứng

Bắt buộc (theo `docs/DEVELOPMENT.md` §5):

1. `npx tsc --noEmit` sạch.
2. `npm run lint` sạch.
3. `npm run build` (webpack) thành công.

Thủ công:

4. Font thật sự là Geist — kiểm bằng DevTools Computed `font-family`, không chỉ nhìn mắt.
5. Không còn emoji icon: `grep -rn "📦\|🔄\|🛡️\|🛒\|🧾\|💰\|📄\|⏰\|✅\|🏢\|👤\|📎" src/` → rỗng.
6. Toggle theme: đổi được, giữ sau reload, không nháy sáng khi load lại (FOUC), tôn trọng
   `prefers-color-scheme` khi chưa từng chọn.
7. Contrast dark mode kiểm riêng, không suy ra từ light.
8. Mobile 375px: cả 7 destination truy cập được từ nav; nội dung không bị nav che.
9. Điều hướng giữa các page hiện skeleton; `error.tsx` retry được.
10. `life/page.tsx` hiện **tất cả** entity (không còn cắt ở 5).
11. Bàn phím: Tab qua nav/dialog/badge, focus ring thấy rõ ở cả 2 theme; `prefers-reduced-motion`
    không làm vỡ layout.
12. Mỗi page có **đúng một** `<h1>` sau khi chuyển sang `PageHeader` (kiểm bằng
    `<h1` xuất hiện 1 lần trong DOM của từng route).

---

## 12. Rủi ro

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Bỏ `items.slice(0, 5)` khiến `life/page.tsx` render toàn bộ entity | Chấp nhận ở quy mô cá nhân. Nếu household vượt ~200 entity thì mới cần phân trang — lúc đó thêm, chưa làm bây giờ. |
| Gom `<h1>` vào `PageHeader` ở 8 page có thể sót hoặc tạo 2 `<h1>` trên một page | Kiểm chứng #12 |
| Đổi `icon: string` → `LucideIcon` phá type ở call-site bị bỏ sót | `tsc --noEmit` bắt được toàn bộ; đây là lý do kiểm chứng #1 là bắt buộc |
| Contrast dark mode không đạt dù light đạt | Mục §11.7 kiểm riêng; bảng §3.5 đã tính trước |
| FOUC ở theme tối | Script chặn phải nằm trong `<head>` **trước** mọi nội dung + `suppressHydrationWarning` |
