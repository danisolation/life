# TROUBLESHOOTING — Lỗi đã gặp thật và cách fix

## npm install chết với EBADPLATFORM

```
npm error notsup Unsupported platform for @next/swc-linux-x64-gnu@16.3.4:
wanted {"os":"linux","cpu":"x64"} (current: {"os":"win32","cpu":"x64"})
```

**Nguyên nhân:** `.npmrc` có `omit=optional`, nên repo pin thẳng các package
native cho Linux vào `devDependencies`. Trên Windows npm chặn chúng.

**Fix:** `npm install --include=optional --force` (đúng như README ghi).

## postinstall lỗi trên Windows

```
scripts/fix-native-bindings.sh: line 4: set: -: invalid option
scripts/fix-native-bindings.sh: line 5: cd: $'scripts/..\r': No such file or directory
```

**Nguyên nhân:** file `.sh` bị checkout với CRLF; bash đọc `\r` thành ký tự
trong tên thư mục và option.

**Fix:** `.gitattributes` có `*.sh text eol=lf`, và chuyển file về LF:

```powershell
$p = "scripts\fix-native-bindings.sh"
$t = [System.IO.File]::ReadAllText($p) -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
```

## Migration mới bị bỏ qua sau khi reset DB

**Triệu chứng:** đã drop `public` rồi mà `npm run db:migrate` báo
`migrations applied successfully` nhưng `\dt` không có bảng nào.

**Nguyên nhân:** drizzle-kit ghi lịch sử vào **`drizzle.__drizzle_migrations`**.
Schema `drizzle` còn nguyên nên migration `0000` bị coi là đã chạy.

**Fix:** drop cả hai schema rồi generate lại:

```bash
docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
rm -rf drizzle && npm run db:generate && npm run db:migrate
```

## `.env.local` có BOM → `DATABASE_URL is not set`

**Triệu chứng:** `npm run db:seed` báo `Error: DATABASE_URL is not set` dù file
có dòng đó. `node --env-file=.env.local -e "console.log(process.env.DATABASE_URL)"`
in ra `undefined`.

**Nguyên nhân:** file được ghi bằng UTF-8 **có BOM** (PowerShell 5.1
`Set-Content -Encoding UTF8` mặc định thêm BOM). Node `--env-file` không parse
được file có BOM.

**Fix:** ghi lại không BOM.

```powershell
$p = Join-Path $PWD ".env.local"
$t = [System.IO.File]::ReadAllText($p).TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
```

(Next.js đọc `.env.local` có BOM vẫn chạy, nên lỗi chỉ lộ ra ở script `node`.)

## `tsc` báo không tìm thấy route đã xoá

```
.next/types/app/(dashboard)/ai/page.ts(2,24): error TS2307: Cannot find module '...'
```

**Nguyên nhân:** `.next/types` là type sinh sẵn, còn trỏ tới route cũ; `tsconfig`
include thư mục này.

**Fix:** xoá `.next` rồi chạy lại: `Remove-Item -Recurse -Force .next` (hoặc
`rm -rf .next`).

## `TypeError: Cannot read properties of undefined (reading 'findFirst')`

**Nguyên nhân:** tạo drizzle client không truyền schema — `drizzle(pool)` — nên
`db.query.*` không tồn tại.

**Fix:** `drizzle(pool, { schema })` với `import * as schema from "./schema"`.

## Lỗi type khó hiểu do trùng tên bảng

```
error TS2448: Block-scoped variable 'transactions' used before its declaration.
error TS2339: Property 'userId' does not exist on type 'TransactionRecord[]'.
```

**Nguyên nhân:** đặt biến local tên `transactions`, trùng với bảng import từ
schema → shadow, và trong query thì `transactions` đang ở TDZ.

**Fix:** đổi tên biến local (`transactionRows`).

## `parseAmount("1.500.000 đ")` báo Invalid amount

**Nguyên nhân:** regex loại ký hiệu tiền chỉ có `₫` (U+20AB) mà thiếu `đ`
(U+0111) — hai ký tự khác nhau.

**Fix:** `/[₫đ$€£¥]|\b(vnd|usd|eur|jpy|krw|gbp)\b/g`.

## Docker daemon không chạy

```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

**Nguyên nhân:** Docker Desktop chưa khởi động (không phải lỗi cấu hình).

**Fix:** mở Docker Desktop rồi chờ engine lên; container `life-admin-postgres`
có `--restart unless-stopped` nên tự chạy lại. Kiểm tra:
`docker ps --format '{{.Names}} {{.Status}}'`.

> Máy này còn một Postgres **native trong WSL ở cổng 5432** với DB
> `life_admin_os` **rỗng** (di sản của phần "manual setup"). Đừng trỏ
> `DATABASE_URL` vào đó — DB thật của app là container ở **5433**.

## Kiểm tra HTML bằng grep bị "sai"

Render server của React chèn `<!-- -->` giữa hai text node liền nhau, nên
`+` và số tiền có thể nằm cách nhau bởi comment:

```html
<span class="... text-success">+<!-- -->20.000.000 ₫</span>
```

Khi verify bằng grep, tìm từng phần (`20.000.000`) thay vì chuỗi ghép
(`+20.000.000`).

## Format tiền khác nhau giữa các máy

`Intl.NumberFormat` phụ thuộc dữ liệu ICU của Node. Test trong
`src/lib/money/amount.test.ts` đã chuẩn hoá non-breaking space
(`replace(/\u00a0/g, " ")`); nếu máy khác in ra kiểu khác (ví dụ `₫50.000`),
sửa kỳ vọng của test theo output thật — logic không đổi.
