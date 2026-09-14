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

## Console đầy warning "Base UI: ... expected a native <button>"

```
Base UI: A component that acts as a button expected a native <button> because
the `nativeButton` prop is true. Rendering a non-<button> removes native button
semantics ... Use a real <button> in the `render` prop, or set `nativeButton`
to `false`.
```

**Nguyên nhân:** `<Button render={<Link />}>` — Base UI Button mặc định coi
`render` là một `<button>`; render ra `<a>` thì vừa mất semantics vừa phát
warning, và badge "Issues" của Next dev hiện đỏ ở góc dưới trái.

**Fix:** điều hướng thì dùng `Link` + `buttonVariants`, đừng mượn Base UI Button:

```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link href="/x" className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
  <ChevronLeft />
</Link>
```

Nếu buộc phải render thứ khác `<button>`, truyền `nativeButton={false}`.
`<DialogTrigger render={<Button />}>` thì **không** dính lỗi này vì Button render
ra `<button>` thật.

## `CardHeader` có sẵn `flex-col`, đè bằng `flex-row` không ăn

`CardHeader` là `cn("flex flex-col gap-0.5 p-4", className)`. Thêm
`className="flex-row"` **không** thắng, vì thứ tự trong file CSS sinh ra quyết
định chứ không phải thứ tự class trong attribute. Muốn tiêu đề và action nằm
cùng dòng thì tự bọc một `div`:

```tsx
<CardHeader>
  <div className="flex items-baseline justify-between gap-4">
    <CardTitle>Recent activity</CardTitle>
    <Link href="...">View all</Link>
  </div>
</CardHeader>
```

## URL sai vẫn ra 404 mặc định của Next

`src/app/(app)/not-found.tsx` chỉ chạy khi code trong nhóm `(app)` gọi
`notFound()`. URL không khớp route nào thì Next dùng `src/app/not-found.tsx`
(cấp gốc) — không có file đó thì hiện trang 404 trần của Next. App này có cả
hai: bản gốc để bắt URL sai, bản trong `(app)` để render trong app shell.

## Số tiền thô lọt vào câu chữ

`Insight` được dựng trong `src/lib/money/insights.ts`, một pure function không
biết currency/locale. Nếu nó tự nối `${minor}` vào `detail`, người dùng sẽ thấy
`623000 over` thay vì `623.000 ₫ over`. Vì vậy `buildInsights` nhận
`formatAmount` (bắt buộc, không optional) — call site trong `src/lib/money-data.ts`
truyền `formatMoney(minor, currency, locale)`. Test
`writes money inside insight details through the injected formatter` canh chỗ này.

## Gemini báo `enum[N]: cannot be empty`

```
400 GenerateContentRequest.generation_config.response_schema.properties[category].enum[3]: cannot be empty
```

**Nguyên nhân:** tôi thêm `""` vào `enum` để làm lựa chọn "không cái nào phù hợp".
Gemini không chấp nhận chuỗi rỗng trong enum.

**Fix:** dùng sentinel (`NO_CATEGORY = "--none--"`) và coi nó là "không gợi ý"
khi parse (`src/lib/ai/category.ts`). Đừng dùng chuỗi rỗng.

## Gemini trả về rỗng dù status 200

**Triệu chứng:** `candidates[0].content.parts` rỗng, `textLen=0`.

**Nguyên nhân:** model 2.5 có "thinking" và **token suy nghĩ tính vào
`maxOutputTokens`**. Với `maxOutputTokens: 32`, đo được
`thoughtsTokenCount: 62` → hết ngân sách trước khi in ra chữ nào.

**Fix:** nâng ngân sách (256–1200 tuỳ việc) hoặc tắt hẳn cho việc đơn giản:
`generationConfig.thinkingConfig.thinkingBudget: 0` — dùng cho phân loại category.
`generateJson()` trong `src/lib/ai/gemini.ts` nhận `thinkingBudget` và
`maxOutputTokens`.

## Gemini 429 — hết quota free tier

```
429 Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests,
limit: 20, model: gemini-2.5-flash
```

**Nguyên nhân:** free tier giới hạn **20 request/ngày** cho `gemini-2.5-flash`.
Trong lúc test tôi đã gọi hết quota, và các lần gọi sau đó fail **ngẫu nhiên**
(3/5 lần) — rất dễ chẩn đoán nhầm thành lỗi code.

**Fix:** `generateJson` ném `GeminiError` mang theo status; route map 429 thành
429 kèm message nói rõ hết quota và cách xử lý (`geminiErrorMessage`). Muốn dùng
nhiều thì bật billing cho key, hoặc đổi sang model khác.

> Cách chẩn đoán nhanh khi AI trả kết quả thất thường: gọi thẳng API bằng curl
> (hoặc script nhỏ) và in `status`, `finishReason`, `thoughtsTokenCount` — đừng
> đoán từ phía app.
