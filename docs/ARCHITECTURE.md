# ARCHITECTURE — Kiến trúc, luồng dữ liệu, quy ước

## 1. Tổng quan

App một người dùng, server-first. Không có state library, không cache layer,
không optimistic update.

```
Browser
  ├── GET  /            → server component: query Drizzle → tính bằng lib/money → render
  ├── GET  /review      → như trên, thêm compare + insights
  └── POST /api/...     → mutation → ghi DB → client gọi router.refresh() → render lại
```

Đọc dữ liệu **không** đi qua REST: `src/lib/money-data.ts` là nơi duy nhất
query 3 tháng giao dịch + categories + budgets của một tháng, rồi trả về
summary/comparison/budgetLines/insights đã tính sẵn. Overview và Review dùng
chung loader này nên không thể lệch nhau.

## 2. Cấu trúc thư mục

```
src/
  app/
    (auth)/{login,register}/     # public, redirect về / nếu đã đăng nhập
    (app)/layout.tsx             # guard requireUser() + AppShell
    (app)/{page,transactions,categories,review,settings}
    (app)/{loading,error,not-found}.tsx
    api/auth/{register,login,logout}
    api/{transactions,categories,budgets,settings}
  components/
    ui/                          # shadcn primitives (vendored)
    layout/                      # app-shell, app-nav, page-header, empty-state, theme-toggle
    auth/                        # login-form, register-form
    money/                       # components của module tiền
    status-badge.tsx             # nơi duy nhất map trạng thái → màu
  lib/
    db/{index,schema,default-categories}.ts
    money/{amount,period,summary,compare,budget,insights}.ts   # pure, có test
    money-data.ts                # loader cho server component
    {auth,session,session-token,validate,format,utils}.ts
scripts/seed-demo.ts
drizzle/                         # migration
```

## 3. Auth

Không dùng NextAuth. Ba file:

- `src/lib/auth.ts` — `hashPassword` / `verifyPassword` (bcrypt, cost 10).
- `src/lib/session-token.ts` — thuần crypto, **không import Next** nên test được
  bằng `node:test`: `signSession(uid)` tạo `base64url(payload).HMAC-SHA256`,
  `verifySessionToken` kiểm chữ ký bằng `timingSafeEqual` rồi kiểm hạn.
- `src/lib/session.ts` — đọc/ghi cookie `session` (`HttpOnly`, `SameSite=Lax`,
  `Secure` khi production, 30 ngày), `getCurrentUser()`, `requireUser()`.

Guard nằm ở `(app)/layout.tsx` và ở từng API route; không có `middleware.ts`.
Payload chỉ chứa `uid` và `exp` — mọi thứ khác đọc từ DB.

## 4. Quy ước tiền

- Lưu **integer minor units** (`amountMinor`, `bigint mode: "number"`).
  `VND/JPY/KRW/IDR/CLP/ISK` = 0 chữ số thập phân, còn lại ×100.
- `parseAmount(chuỗi, currency)` là nơi **duy nhất** hiểu định dạng tiền:
  `50.000` → 50000, `50k` → 50000, `1,5tr` → 1500000, `12.50` USD → 1250.
  API nhận **chuỗi thô** người dùng gõ rồi parse, lỗi trả 400 kèm message.
- `formatMoney(minor, currency, locale)` dùng `Intl.NumberFormat`; hiển thị theo
  `locale` của user (`vi-VN` mặc định).
- Mỗi giao dịch lưu `currency` tại thời điểm ghi. Vì tổng tháng cộng theo
  `amountMinor` không phân biệt đơn vị, `PATCH /api/settings` **chặn đổi
  currency khi đã có giao dịch** (409) — nếu không, tổng sẽ trộn hai đơn vị.

## 5. Quy ước ngày

Ngày lưu `date({ mode: "string" })` → `YYYY-MM-DD`. Tháng là `YYYY-MM`.
Mọi phép tính kỳ tháng nằm trong `src/lib/money/period.ts` và nhận `today` làm
tham số, không đọc `Date.now()` bên trong, nên test được và không lệch timezone.

`daysElapsed(month, today)` trả số ngày đã qua của tháng hiện tại, còn tháng
khác trả số ngày của tháng đó — dùng để tính `avgPerDayMinor` mà không chia 0.

## 6. Insight

`src/lib/money/insights.ts` là pure function, 8 rule: savings-rate, budget-over,
budget-warn, category-spike, top-category, commitments, pace, outlier. Mỗi rule
nhận dữ liệu đã tính, trả về `Insight { id, severity, title, detail, amountMinor? }`,
cuối cùng sort theo severity rồi theo số tiền. Ngưỡng là heuristic, sửa trong
file này là đủ — không cần migration.

Đây **không phải AI**. Mọi con số đều tất định và giải thích được.

## 7. Giao diện

- Design tokens trong `src/app/globals.css` (light + dark), có token ngữ nghĩa
  `success` / `warning` / `info` dạng triad `-muted` / `-muted-foreground`.
- `src/components/status-badge.tsx` map severity → tone; không hard-code màu.
- Dark mode bằng script chống FOUC trong `layout.tsx` + `localStorage.theme`.
- Số liệu luôn `tabular-nums`; mọi trang dùng `PageHeader` và `space-y-6`.
- Mobile: sidebar ẩn, điều hướng trong `Sheet`.
