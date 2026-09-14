# DEVELOPMENT — Quy ước và cách mở rộng

## 1. Gate trước khi coi là xong

```bash
npm test              # unit test logic tiền
npm run lint          # 0 error
npx tsc --noEmit      # sạch
npm run build         # xanh
```

Sau khi xoá/đổi route, chạy `Remove-Item -Recurse -Force .next` (hoặc `rm -rf .next`)
trước `tsc`, vì type sinh sẵn trong `.next/types` còn trỏ tới route cũ.

## 2. Quy ước code

- **Server component là mặc định.** Chỉ thêm `"use client"` khi cần state,
  event handler, hoặc browser API.
- **Đọc** bằng query trực tiếp trong server page (qua `src/lib/money-data.ts`);
  **ghi** bằng REST API. Sau mutation gọi `router.refresh()`.
- **Validate ở biên**: helper trong `src/lib/validate.ts`, không thêm zod.
- **Không thêm dependency** nếu có thể làm bằng thứ đã có (`Intl`, `node:crypto`,
  `node:test`, bar bằng `div` thay vì chart lib).
- **Logic tiền phải là pure function** trong `src/lib/money/*`, nhận thời gian
  qua tham số, và có test colocate `*.test.ts` cạnh file.
- Test import file nguồn **kèm đuôi `.ts`** (`./period.ts`) — Node
  `--experimental-strip-types` không resolve import thiếu đuôi. Import type thì
  được phép thiếu đuôi vì bị xoá khi strip.
- Tránh đặt tên biến local trùng tên bảng Drizzle (`transactions`, `budgets`,
  `categories`) — sẽ shadow import và gây lỗi khó hiểu.
- UI tiếng Anh; tiền hiển thị qua `formatMoney`, ngày qua `src/lib/format.ts`.
- Màu trạng thái đi qua `src/components/status-badge.tsx`.

## 3. Thêm một endpoint mutation

1. Tạo `src/app/api/<name>/route.ts` (hoặc `[id]/route.ts`).
2. Mở đầu bằng:
   ```ts
   const user = await getCurrentUser();
   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   ```
3. Đọc body bằng `readJson(request)` (trả `null` → 400 `Invalid JSON body`).
4. Validate: enum bằng so sánh chuỗi, ngày bằng `isValidDate`, tháng bằng
   `isMonth`, tiền bằng `parseAmount` trong `try/catch` → 400 kèm message.
5. Mọi truy vấn thêm `eq(<table>.userId, user.id)`.
6. Trả `{ <tên> }` và 201 cho tạo mới; lỗi `{ error }` với status phù hợp.
7. Nếu route có `params`, nhớ `params` là Promise trong Next 16: `const { id } = await params`.
8. Cập nhật `docs/API.md`.

## 4. Thêm một trang

1. Tạo `src/app/(app)/<name>/page.tsx` là async server component, bắt đầu bằng
   `const user = await requireUser()`.
2. Đọc `searchParams` (cũng là Promise): `const { month } = await searchParams`.
3. Nếu trang cần tổng hợp theo tháng, dùng `loadMonthView(user.id, month, today)`
   trong `src/lib/money-data.ts` thay vì tự query — tránh lệch logic với
   Overview/Review.
4. Layout: `PageHeader` + `space-y-6`, dữ liệu trong `Card`.
5. Component tương tác đặt ở `src/components/money/*.tsx` với `"use client"`.
6. Thêm mục vào `NAV_ITEMS` trong `src/components/layout/app-nav.tsx`.

## 5. Thêm một insight rule

1. Viết hàm nhỏ trong `src/lib/money/insights.ts`, trả `Insight[]`.
2. Gọi nó trong `buildInsights` (thứ tự không quan trọng — hàm sort cuối).
3. Thêm 1 test dương + 1 test âm vào `insights.test.ts`.
4. Nếu muốn rule xuất hiện trong demo, sửa `scripts/seed-demo.ts` để tạo đúng
   tình huống — **không** sửa rule cho khớp dữ liệu.

## 6. Commit

- Conventional commits, tiếng Anh: `feat(money):`, `fix(api):`, `docs:`, `chore:`.
- Mỗi commit phải để repo build được.
- Kết thúc message bằng trailer:
  `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>`
- Không commit `.commandcode/`, `.env.local`, `.next/`.
