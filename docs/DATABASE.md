# DATABASE — Schema, migration, vận hành

Kết nối: `DATABASE_URL` trong `.env.local`
(`postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os`).
Container: `life-admin-postgres` (Postgres 17-alpine).

## 1. Sơ đồ

```
users 1───* categories 1───* transactions
  │              │
  │              └───* budgets   (unique theo user + category + month)
  │
  └───* transactions / budgets    (mọi bảng đều có userId, cascade khi xoá user)
```

Enum duy nhất: `category_kind` = `income | expense`.

## 2. Chi tiết bảng (khớp `src/lib/db/schema.ts`)

| Bảng | Cột | Ghi chú |
| ---- | --- | ------- |
| `users` | id, email (unique), name, passwordHash, **currency** (3, default VND), **locale** (default `vi-VN`), createdAt, updatedAt | Một người dùng một tài khoản |
| `categories` | id, userId→users cascade, name(50), kind enum, color(7 hex), sortOrder, **archivedAt** nullable, createdAt, updatedAt | Unique `(userId, kind, name)`; xoá mềm để giữ lịch sử giao dịch |
| `transactions` | id, userId cascade, kind enum, categoryId→categories **set null**, **amountMinor** bigint, **currency**(3), **occurredOn** date, note(500), createdAt, updatedAt | Index `(userId, occurredOn)` và `(userId, categoryId)` |
| `budgets` | id, userId cascade, categoryId→categories cascade, **month** date (ngày 01), amountMinor bigint, createdAt, updatedAt | Unique `(userId, categoryId, month)`; chỉ đặt cho category expense |

Quy ước:

- **Tiền**: integer minor units. `VND/JPY/KRW/IDR/CLP/ISK` không có phần thập
  phân, còn lại ×100. Không dùng `numeric`/float cho tiền.
- **Ngày**: `date` với `mode: "string"` → luôn là `YYYY-MM-DD`, không dính
  timezone.
- Tên cột DB đều **snake_case tường minh**, nên viết SQL tay không cần quote
  (khác bản life-admin cũ).

## 3. Migration

```bash
# Sửa src/lib/db/schema.ts xong:
npm run db:generate   # sinh drizzle/XXXX_<tên>.sql — đọc SQL trước khi chạy
npm run db:migrate    # apply, track trong drizzle.__drizzle_migrations
npm run db:studio     # xem/sửa data bằng GUI
```

> **Reset DB phải drop cả schema `drizzle`.** drizzle-kit ghi lịch sử migration
> vào `drizzle.__drizzle_migrations`. Nếu chỉ `DROP SCHEMA public CASCADE`,
> migration mới sẽ bị coi là đã apply và **bị bỏ qua im lặng** — bảng không được
> tạo mà lệnh vẫn báo thành công.
>
> ```bash
> docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os \
>   -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
> rm -rf drizzle && npm run db:generate && npm run db:migrate
> ```
>
> Sau khi reset, xoá `.next` trước khi chạy `tsc` vì type sinh sẵn còn trỏ tới
> route cũ.

## 4. Backup / restore

```bash
# Backup
docker exec life-admin-postgres pg_dump -U lifeadmin life_admin_os > backup-$(date +%F).sql

# Restore
cat backup-xxx.sql | docker exec -i life-admin-postgres psql -U lifeadmin -d life_admin_os
```

## 5. Query debug hay dùng

```bash
P() { docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "$1"; }
P "SELECT to_char(occurred_on,'YYYY-MM') AS month, kind, count(*), sum(amount_minor) FROM transactions GROUP BY 1,2 ORDER BY 1,2;"
P "SELECT c.name, count(*), sum(t.amount_minor) FROM transactions t JOIN categories c ON c.id = t.category_id GROUP BY 1 ORDER BY 3 DESC;"
P "SELECT c.name, b.month, b.amount_minor FROM budgets b JOIN categories c ON c.id = b.category_id ORDER BY 2, 1;"
P "SELECT email, currency, locale FROM users;"
```
