# SETUP — Dựng máy mới từ A–Z

Tài liệu này giúp bất kỳ máy nào (của bạn hoặc máy khác) dựng và chạy tiếp
dự án trong ~15 phút. Đọc từ trên xuống, làm theo thứ tự.

## 1. Yêu cầu

| Thứ         | Version tối thiểu | Kiểm tra          |
| ----------- | ----------------- | ----------------- |
| Node.js     | 22.x              | `node --version`  |
| npm         | 10.x              | `npm --version`   |
| Docker      | 24.x (để chạy Postgres) | `docker --version` |
| Git         | bất kỳ            | `git --version`   |
| OpenSSL     | để sinh secret    | `openssl version` |

> Không có Docker? Cài PostgreSQL 17 native và tạo DB/user theo
> [DATABASE.md](DATABASE.md#manual-postgres-setup). Mọi bước còn lại giống nhau.

## 2. Clone + cài dependencies

```bash
git clone <repo-url> life-admin-os
cd life-admin-os
npm install
```

`npm install` sẽ chạy `postinstall` → `scripts/fix-native-bindings.sh`.
Kiểm tra không có lỗi đỏ ở cuối output.

> **Lưu ý môi trường:** `.npmrc` trong repo chứa `omit=optional` — đây là
> workaround cố ý cho bug npm (chi tiết [TROUBLESHOOTING.md](TROUBLESHOOTING.md#npm-optional-deps)).
> **Đừng xóa file này.** Các binary native cho Linux x64 đã được pin trực tiếp
> trong `devDependencies` (`@tailwindcss/oxide-linux-x64-gnu`,
> `lightningcss-linux-x64-gnu`, `@next/swc-linux-x64-gnu`).
> Trên macOS/Windows cần thay bằng binary đúng platform.

## 3. Database

### 3a. Khởi động Postgres (Docker)

```bash
docker run -d --name life-admin-postgres --restart unless-stopped \
  -e POSTGRES_USER=lifeadmin \
  -e POSTGRES_PASSWORD=lifeadmin_dev \
  -e POSTGRES_DB=life_admin_os \
  -p 5433:5432 \
  postgres:17-alpine

docker exec life-admin-postgres pg_isready -U lifeadmin
# => /var/run/postgresql:5432 - accepting connections
```

> Port **5433** để tránh đụng Postgres khác trên máy (5432).
> Đổi port thì sửa `DATABASE_URL` tương ứng.

### 3b. Chuyển DB có sẵn sang máy khác (nếu có dữ liệu cũ)

```bash
# Máy cũ: dump
docker exec life-admin-postgres pg_dump -U lifeadmin life_admin_os > backup.sql

# Máy mới: sau khi container chạy, restore
cat backup.sql | docker exec -i life-admin-postgres psql -U lifeadmin -d life_admin_os
```

## 4. Env

```bash
cp .env.example .env.local
```

Mở `.env.local` và chỉnh:

| Biến | Giá trị máy mới |
| ---- | --------------- |
| `DATABASE_URL` | `postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os` (khớp container bước 3) |
| `AUTH_SECRET` | **BẮT BUỘC đổi**: `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` (hoặc port bạn chạy) |
| `AI_PROVIDER` | Giữ `mock` (chưa có key thật — xem [ROADMAP.md](ROADMAP.md#ai-provider-thật)) |
| `GOOGLE_CLIENT_ID/SECRET` | Để trống = tắt login Google, chỉ dùng email/password |

> `.env.local` đã nằm trong `.gitignore` — **không commit**.

## 5. Migration

```bash
npm run db:migrate
# => [✓] migrations applied successfully!
```

Verify bảng đã có:

```bash
docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "\dt"
# Phải thấy 10 bảng: users, households, household_members, entities,
# entity_relations, documents, tasks, reminders, audit_logs, ai_conversations
```

Lần đầu clone repo (chưa có file `drizzle/*.sql`) thì chạy `npm run db:generate`
trước để sinh migration từ `src/lib/db/schema.ts`.

## 6. Chạy dev

```bash
npm run dev
# => ▲ Next.js ... Local: http://localhost:3000
```

Mở `http://localhost:3000/register` → tạo tài khoản → tự động vào dashboard.
Đăng ký sẽ tự tạo 1 household + gán role `admin`.

## 7. Verify checklist (máy mới phải pass hết)

- [ ] `npx tsc --noEmit` → không báo lỗi
- [ ] `npm run build` → `✓ Compiled successfully`, liệt kê đủ routes
- [ ] Đăng ký user mới thành công (`{"message":"User created successfully"}`)
- [ ] Login bằng email/password → vào được `/` (dashboard)
- [ ] Upload 1 file `.txt` ở trang Inbox → thấy extraction result
- [ ] Bấm "Save to Life Graph" → thấy "Saved to Life Admin Graph" + số reminders
- [ ] Sang trang Life → thấy entity vừa tạo

Lệnh test nhanh bằng curl cho từng bước: xem [API.md](API.md#quick-test-script).

## 8. Các port và service

| Service  | Địa chỉ                   |
| -------- | ------------------------- |
| App dev  | http://localhost:3000     |
| Postgres | localhost:5433 (user `lifeadmin`, db `life_admin_os`) |

Gặp lỗi? → [TROUBLESHOOTING.md](TROUBLESHOOTING.md) trước.
