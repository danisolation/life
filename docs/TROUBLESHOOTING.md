# TROUBLESHOOTING — Lỗi đã gặp + cách fix

## npm optional-deps

**Hiện tượng:** `npm install` báo thành công nhưng `node_modules/tailwindcss`,
`drizzle-kit` (và các thư mục `@...` scope) trống rỗng hoặc biến mất;
`tsc`/`build` báo `Cannot find module`.

**Nguyên nhân:** bug npm với optional native dependencies
(npm/cli#4828). npm tạo thư mục rồi bỏ qua giải nén, và mọi lệnh `npm install`
sau đó đều coi như "đã cài" (reify moves rỗng).

**Fix (đã áp dụng trong repo):**
1. `.npmrc` chứa `omit=optional` — **không xóa**.
2. Binary Linux x64 pin trực tiếp trong devDependencies:
   `@tailwindcss/oxide-linux-x64-gnu`, `lightningcss-linux-x64-gnu`,
   `@next/swc-linux-x64-gnu`.
3. `postinstall` chạy `scripts/fix-native-bindings.sh` copy file `.node`
   vào đúng chỗ loader tìm (npm thường nest optionals dưới package cha).
4. Nếu vẫn lỗi sau `npm install` sạch: `rm -rf node_modules package-lock.json
   && npm install` rồi kiểm tra `ls node_modules/tailwindcss`.

> Đổi OS (macOS/Windows): thay 3 package binary trên bằng variant đúng
> platform (`-darwin-arm64`, `-win32-x64-msvc`...) — xem npmjs của từng package.

## Tailwind/PostCSS: "Module parse failed: Unexpected character '@'"

**Hiện tượng:** dev server 500 ở mọi trang, log có `Module parse failed` ở
`globals.css`, kể cả với CSS thuần (`body {...}` cũng lỗi).

**Checklist theo thứ tự:**
1. `ls node_modules/@tailwindcss/` phải có `oxide-linux-x64-gnu`
   (không phải thư mục rỗng) — nếu rỗng → lỗi npm ở trên.
2. `node_modules/@tailwindcss/oxide/tailwindcss-oxide.linux-x64-gnu.node`
   phải tồn tại (do postinstall copy) — Turbopack bắt buộc có.
3. `node_modules/lightningcss/lightningcss.linux-x64-gnu.node` phải tồn tại.
4. `postcss.config.js` (CJS) tồn tại ở root.
5. Xóa cache: `rm -rf .next`, restart dev.

## Turbopack vs webpack

- **Dev (`npm run dev`)**: Turbopack mặc định — OK sau khi fix bindings.
- **Build (`npm run build`)**: đã gắn `--webpack` vì sandbox Turbopack không
  resolve native `.node` trong môi trường này. Đừng bỏ flag khi chưa test kỹ.

## drizzle-kit: "Please provide required params ... url: ''"

drizzle-kit không tự đọc `.env.local`. `drizzle.config.ts` đã gọi
`dotenv.config({ path: ".env.local" })` — nếu đổi tên file env thì sửa cả đó.

## NextAuth login 500 / "Cannot find module .../auth"

- Kiểm tra `AUTH_SECRET` đã set trong `.env.local` (đừng để trống).
- Google login không cấu hình key → nút Google sẽ lỗi; dùng email/password.
- Session null sau POST credentials: 99% là thiếu/sai `csrfToken` — phải GET
  `/api/auth/csrf` với cùng cookie jar rồi POST kèm token đó (xem [API.md](API.md#auth)).

## Database

| Hiện tượng | Fix |
| ---------- | --- |
| `connect ECONNREFUSED :5433` | `docker start life-admin-postgres` |
| Port 5433 bận | Container cũ còn chạy: `docker ps`, đổi `-p` và `DATABASE_URL` |
| `\dt` thiếu bảng | `npm run db:migrate`; kiểm tra `DATABASE_URL` trỏ đúng DB |
| Cột camelCase lỗi SQL | Quote: `SELECT "fileName" FROM documents;` |
| Muốn reset sạch | Xóa container → tạo lại → `db:migrate` (xem [DATABASE.md](DATABASE.md#5-backup--restore)) |

## Upload

| Hiện tượng | Nguyên nhân |
| ---------- | ----------- |
| 400 `File type ... not supported` | Chỉ nhận pdf/jpg/png/webp/heic/doc/docx/txt |
| 400 `File too large` | Giới hạn `MAX_FILE_SIZE` (mặc định 10MB) |
| 409 `already been confirmed` | Document đã confirm — đúng behavior, không phải bug |
| Extraction toàn "Demo Store" | Đang dùng `AI_PROVIDER=mock` — cần provider thật ([ROADMAP.md](ROADMAP.md#phase-5--ai-thật)) |

## Build/typecheck

- `npx tsc --noEmit` phải sạch — lỗi `Cannot find module 'X'` sau install sạch
  gần như luôn là lỗi npm optional-deps ở đầu file này.
- `next.config.ts` chạy 30s+ lần đầu là bình thường (Next compile config).
- Cảnh báo `NODE_TLS_REJECT_UNAUTHORIZED=0` trong log: do env của máy dev gốc,
  không phải lỗi app.
