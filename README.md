# Life Admin OS

Hệ điều hành quản trị đời sống cá nhân: biến hóa đơn, biên lai, bảo hành,
subscription thành **Life Admin Graph** có cấu trúc, rồi chủ động nhắc deadline,
gợi ý tiết kiệm và chuẩn bị hành động.

> **Nguyên tắc cốt lõi:** Đừng chỉ nhắc user. Hiểu ngữ cảnh → đề xuất việc nên làm
> → chuẩn bị sẵn → thực thi khi được phép.
>
> **Remember → Understand → Recommend → Act**

## Tech stack (thực tế trong repo)

| Layer     | Công nghệ                                   |
| --------- | ------------------------------------------- |
| Framework | Next.js 16.3.4 (App Router), React 19       |
| Language  | TypeScript (strict)                         |
| Styling   | Tailwind CSS v4 + shadcn/ui                 |
| Database  | PostgreSQL 17 + JSONB (Drizzle ORM)         |
| Auth      | NextAuth.js v5 (beta, JWT strategy)         |
| AI        | Abstraction layer (`AI_PROVIDER=mock` Dev)  |
| Upload    | Local disk `./uploads` (MVP, sau này S3)    |

## Quick start (máy mới)

```bash
# 1. Clone + cài đặt
git clone <repo-url> life-admin-os && cd life-admin-os
npm install            # postinstall tự fix native bindings

# 2. Database (Docker)
docker run -d --name life-admin-postgres --restart unless-stopped \
  -e POSTGRES_USER=lifeadmin -e POSTGRES_PASSWORD=lifeadmin_dev \
  -e POSTGRES_DB=life_admin_os -p 5433:5432 postgres:17-alpine

# 3. Env
cp .env.example .env.local
# Sửa AUTH_SECRET (openssl rand -base64 32), kiểm tra DATABASE_URL

# 4. Migration + chạy
npm run db:migrate
npm run dev            # http://localhost:3000
```

Chi tiết từng bước: [`docs/SETUP.md`](docs/SETUP.md).

## Scripts

| Script          | Chạy gì                        |
| --------------- | ------------------------------ |
| `npm run dev`   | Dev server (Turbopack)         |
| `npm run build` | Production build (**webpack**) |
| `npm run start` | Chạy bản đã build              |
| `npm run lint`  | ESLint                         |
| `npm run db:generate` | Sinh migration từ schema |
| `npm run db:migrate`  | Chạy migration             |
| `npm run db:push`     | Đẩy schema thẳng (dev)     |
| `npm run db:studio`   | Drizzle Studio GUI         |

## Tài liệu

| File | Nội dung |
| ---- | -------- |
| [`docs/SETUP.md`](docs/SETUP.md) | Setup máy mới từ A–Z, verify checklist |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Kiến trúc, luồng Inbox, auth, multi-tenancy |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema 10 bảng, migration, backup/restore |
| [`docs/API.md`](docs/API.md) | Toàn bộ API routes + ví dụ curl |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Workflow dev, conventions, cách thêm tính năng |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Đã xong gì, tiếp theo làm gì |
| [`docs/SPEC.md`](docs/SPEC.md) | Spec sản phẩm gốc (tầm nhìn, 40 mục) |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Lỗi đã gặp + cách fix |
| [`NATIVE-BINDINGS.md`](NATIVE-BINDINGS.md) | Workaround npm optional-deps bug |

## Trạng thái hiện tại

- [x] Phase 1 — Foundation: auth, household, navigation 6 trang
- [x] Phase 2 — Inbox thật: upload → AI extract → confirm → entity + reminders + audit
- [x] Database live, migration chạy, auth loop verify end-to-end
- [ ] Phase 3 — Entity detail pages, graph relations UI
- [ ] Phase 4–6 — Deadline engine UI, AI search/brief, tasks/workflows

Chi tiết: [`docs/ROADMAP.md`](docs/ROADMAP.md).
