# AGENTS.md

App quản lý tiền cá nhân (Next.js 16 App Router + Postgres/Drizzle). Mọi thứ
người dùng nhìn thấy bằng tiếng Anh; docs và trao đổi tiếng Việt.

## Lệnh

- `npm run dev` — dev server
- `npm test` — unit test (`node --experimental-strip-types --test "src/**/*.test.ts"`)
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — gate trước khi coi là xong
- `npm run db:migrate` / `db:generate` / `db:seed`

## Quy ước bắt buộc

- **Tiền** lưu integer **minor units**; `VND/JPY/KRW/IDR/CLP/ISK` không có phần
  thập phân, còn lại ×100. Không bao giờ dùng số thực cho tiền.
- **Ngày** lưu dạng `YYYY-MM-DD` (Drizzle `date({ mode: "string" })`) để không
  lệch ngày vì timezone. Tháng là `YYYY-MM`.
- Mọi truy vấn DB phải scope theo `userId` lấy từ session; không nhận `userId`
  từ client.
- Đọc dữ liệu bằng server component query trực tiếp; REST chỉ dùng cho mutation
  và auth. Lỗi trả `{ error: string }` kèm status phù hợp.
- Validate tay trong `src/lib/validate.ts`; **không thêm dependency** (đã có
  `Intl`, `node:crypto`, `node:test` là đủ).
- Logic tiền nằm trong `src/lib/money/*` dưới dạng pure function, có test
  colocate (`*.test.ts`) — tham số thời gian truyền vào, không đọc `Date.now()`.
- Form gửi **chuỗi số tiền thô** người dùng gõ; server mới parse.
- Server page là async component; component tương tác đặt trong
  `src/components/<domain>/` và có `"use client"`. Sau mutation gọi
  `router.refresh()`.
- UI dùng shadcn primitives trong `src/components/ui` (Base UI, dùng prop
  `render`, không có `asChild`) và token trong `globals.css`; màu trạng thái đi
  qua `src/components/status-badge.tsx`, không hard-code `bg-red-500`.
- Không commit `.commandcode/`, `.env.local`.

## Môi trường

Trước khi viết code Next, đọc guide trong `node_modules/next/dist/docs/`.
`cookies()`, `params`, `searchParams` đều là Promise trong Next 16.

Trên Windows: `npm install --include=optional --force` (các package pin cho
Linux bị chặn platform), `.sh` phải giữ LF (đã khoá bằng `.gitattributes`), và
`.env.local` phải lưu **không BOM** nếu không `node --env-file` sẽ không đọc
được. Chi tiết: `docs/TROUBLESHOOTING.md`.
