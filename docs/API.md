# API — Endpoint, request/response, ví dụ

Đọc dữ liệu (Overview, Transactions, Categories, Review) do server component
query trực tiếp qua Drizzle — **không có GET endpoint**, để logic truy vấn không
bị lặp hai nơi. Dưới đây là toàn bộ endpoint ghi.

Mọi route tự lấy session từ cookie; không có session → `401`. Không route nào
nhận `userId` từ client. Lỗi luôn có dạng `{ "error": string }`.

| Method + path | Body | Trả về | Lỗi |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email, name, password }` | 201 `{ user }` + set cookie | 400, 409 email tồn tại |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user }` + set cookie | 401 (message chung) |
| `POST /api/auth/logout` | – | 200 `{ ok: true }` + xoá cookie | – |
| `POST /api/transactions` | `{ kind, categoryId?, amount, occurredOn, note? }` | 201 `{ transaction }` | 400 amount/ngày sai, 400 kind lệch category, 404 category không thuộc user |
| `PATCH /api/transactions/[id]` | tập con của body trên | 200 `{ transaction }` | 400, 404 |
| `DELETE /api/transactions/[id]` | – | 200 `{ ok: true }` | 404 |
| `POST /api/categories` | `{ name, kind, color? }` | 201 `{ category }` | 400, 409 trùng tên |
| `PATCH /api/categories/[id]` | `{ name?, color?, sortOrder?, archived? }` | 200 `{ category }` | 400 (kể cả gửi `kind`), 404 |
| `DELETE /api/categories/[id]` | – | 200 `{ ok: true }` | 404, 409 còn giao dịch (gợi ý archive) |
| `PUT /api/budgets` | `{ month, entries: [{ categoryId, amount }] }` | 200 `{ budgets }` | 400, 404 |
| `PATCH /api/settings` | `{ name?, currency?, locale? }` | 200 `{ user }` | 400, 409 đổi currency khi đã có giao dịch |
| `POST /api/settings/password` | `{ current, next }` | 200 `{ ok: true }` | 400, 401 sai mật khẩu hiện tại |

Ghi chú:

- `amount` là **chuỗi thô** người dùng gõ (`"50000"`, `"50k"`, `"1,5tr"`,
  `"12.50"`); server parse bằng `parseAmount` theo `currency` của user.
- `PUT /api/budgets` là bulk upsert trong một transaction DB; `amount` null hoặc
  rỗng thì xoá dòng budget đó. Chỉ nhận category `kind = expense` của chính user.
- `PATCH /api/categories/[id]` không cho đổi `kind` (sẽ làm lệch giao dịch cũ).

## Ví dụ curl

```bash
# Đăng nhập, lưu cookie
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@money.local","password":"money1234"}'

# Thêm chi tiêu 50k hôm nay
curl -s -b cookies.txt -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"kind":"expense","amount":"50k","occurredOn":"2026-09-14","note":"Lunch"}'
# → 201 {"transaction":{...,"amountMinor":50000,"currency":"VND"}}

# Đặt ngân sách cho một category (5 triệu)
curl -s -b cookies.txt -X PUT http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"month":"2026-09","entries":[{"categoryId":"<uuid>","amount":"5tr"}]}'

# Xoá ngân sách (amount null)
curl -s -b cookies.txt -X PUT http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"month":"2026-09","entries":[{"categoryId":"<uuid>","amount":null}]}'

# Đổi currency khi đã có giao dịch → 409
curl -s -b cookies.txt -X PATCH http://localhost:3000/api/settings \
  -H "Content-Type: application/json" -d '{"currency":"USD"}'
```
