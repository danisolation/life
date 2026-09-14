# Money OS

App quản lý tiền cá nhân, một người dùng: ghi thu nhập và chi tiêu, phân loại,
đặt ngân sách theo category, rồi xem lại từng tháng kèm insight.

Vòng lặp cốt lõi: **nhập → phân loại → xem tháng này → đánh giá → điều chỉnh**.

## Tech stack (thực tế trong repo)

| Layer     | Công nghệ                                     |
| --------- | --------------------------------------------- |
| Framework | Next.js 16.3.4 (App Router), React 19.2.8     |
| Language  | TypeScript strict                             |
| Styling   | Tailwind CSS v4 + shadcn/ui (Base UI)         |
| Database  | PostgreSQL 17 + Drizzle ORM                   |
| Auth      | Session cookie tự viết (bcrypt + HMAC)        |
| Test      | `node:test` (Node 22), không thêm dependency   |

## Quick start (máy mới)

```bash
# 1. Cài đặt
npm install                  # Linux/macOS
npm install --include=optional --force   # Windows, xem docs/TROUBLESHOOTING

# 2. Database (Docker)
docker run -d --name life-admin-postgres --restart unless-stopped \
  -e POSTGRES_USER=lifeadmin -e POSTGRES_PASSWORD=lifeadmin_dev \
  -e POSTGRES_DB=life_admin_os -p 5433:5432 postgres:17-alpine

# 3. Env
cp .env.example .env.local
# Sinh SESSION_SECRET: openssl rand -base64 32
# Lưu file KHÔNG BOM, nếu không `node --env-file` sẽ không đọc được

# 4. Migration + dữ liệu demo + chạy
npm run db:migrate
npm run db:seed
npm run dev                  # http://localhost:3000
```

Tài khoản demo sau khi seed: `demo@money.local` / `money1234` (VND, 6 tháng dữ liệu).

## Scripts

| Script                | Chạy gì                                  |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Dev server (Turbopack)                   |
| `npm run build`       | Production build (**webpack**)           |
| `npm run start`       | Chạy bản đã build                        |
| `npm run lint`        | ESLint                                   |
| `npm test`            | Unit test cho `src/**/*.test.ts`         |
| `npm run db:generate` | Sinh migration từ `src/lib/db/schema.ts` |
| `npm run db:migrate`  | Apply migration                          |
| `npm run db:seed`     | Seed tài khoản demo + 6 tháng dữ liệu    |
| `npm run db:studio`   | Drizzle Studio GUI                       |

## Tài liệu

| File                                           | Nội dung                                             |
| ---------------------------------------------- | ---------------------------------------------------- |
| [`docs/SETUP.md`](docs/SETUP.md)               | Setup máy mới từ A–Z, checklist verify                |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Kiến trúc, luồng đọc/ghi, auth, quy ước tiền          |
| [`docs/DATABASE.md`](docs/DATABASE.md)         | 4 bảng, migration, backup/restore, query debug        |
| [`docs/API.md`](docs/API.md)                   | Toàn bộ endpoint + ví dụ curl                         |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)   | Quy ước code, cách thêm trang/endpoint, commit        |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)           | Đã xong gì, tiếp theo làm gì                          |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Lỗi đã gặp thật + cách fix                  |
| [`docs/superpowers/specs/2026-09-14-money-app-design.md`](docs/superpowers/specs/2026-09-14-money-app-design.md) | Spec thiết kế |
| [`docs/superpowers/plans/2026-09-14-money-app-rebuild.md`](docs/superpowers/plans/2026-09-14-money-app-rebuild.md) | Plan triển khai |

## Trạng thái hiện tại

- [x] Schema 4 bảng (`users`, `categories`, `transactions`, `budgets`) + migration `0000`
- [x] Auth: đăng ký/đăng nhập/đăng xuất, session cookie HttpOnly ký HMAC, đổi mật khẩu
- [x] Logic tiền thuần: parse/format minor units, kỳ tháng, tổng hợp, so sánh, ngân sách, 8 insight rule — 29 unit test
- [x] API mutation: transactions, categories, budgets, settings
- [x] 5 trang: Overview, Transactions, Categories, Review, Settings
- [x] Seed demo 6 tháng VND + tài liệu

Chi tiết và việc tiếp theo: [`docs/ROADMAP.md`](docs/ROADMAP.md).
