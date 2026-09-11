# DATABASE — Schema, migration, vận hành

Kết nối: `DATABASE_URL` trong `.env.local`
(`postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os`).
Container: `life-admin-postgres` (Postgres 17-alpine).

## 1. Sơ đồ 10 bảng

```
households 1───* household_members *───1 users
    │ 1                                    │ (createdBy, assigneeId,
    │ *                                    │  ownerId, uploadedBy)
    ├────── entities ───┐
    │         │ *       │ 1 (entityId, nullable)
    │         │         ▼
    │         │     documents ── fileUrl → ./uploads (qua /api/files)
    │         │         │ tasks (entityId, assigneeId, ownerId)
    │         │         │ reminders (entityId, taskId nullable)
    │         ▼         │
    │   entity_relations (fromEntityId → toEntityId)
    │
    ├────── tasks / reminders / documents / audit_logs / ai_conversations
```

## 2. Chi tiết bảng (khớp `src/lib/db/schema.ts`)

| Bảng | Cột chính | Ghi chú |
| ---- | --------- | ------- |
| `households` | id, name, currency(3, default USD), locale(default en-US) | Mỗi user đăng ký được 1 household |
| `users` | id, email unique, name, passwordHash nullable (OAuth thì null), image, emailVerified | NextAuth + credentials |
| `household_members` | householdId→households cascade, userId→users cascade, role enum, joinedAt; **unique(householdId, userId)** | Roles: admin/member/viewer |
| `entities` | id, **type enum (12 loại)**, householdId cascade, name, description, **attributes JSONB**, createdBy→users, archivedAt nullable (xóa mềm) | Node của Life Admin Graph |
| `entity_relations` | fromEntityId cascade, toEntityId cascade, relationType enum (9 loại), metadata JSONB | Edge của graph |
| `documents` | entityId→entities **set null**, householdId cascade, uploadedBy, fileName, fileUrl (`/api/files/<uuid>-<name>`), fileType, fileSize, extractedData JSONB, confidence JSONB, **status** (pending/processing/completed/failed) | 1 document confirm tối đa 1 entity (`entityId` + 409 guard) |
| `tasks` | entityId→entities set null, householdId cascade, title, description, status enum (pending/in_progress/completed/cancelled), priority enum, dueDate, completedAt, assigneeId/ownerId/createdBy→users | Task checkbox ở UI hiện **chưa persist** xuống DB |
| `reminders` | entityId→entities **cascade**, taskId→tasks set null, householdId cascade, type enum (deadline/preparation/follow_up/custom), title, message, triggerAt, status enum (scheduled/sent/dismissed/snoozed) | Auto-sinh ở confirm endpoint |
| `audit_logs` | actor (string: `CaptureAgent` hoặc `User:<id>`), action, targetEntity, targetType, reason, source, confidence (int 0–100), metadata JSONB, householdId nullable | Không FK để log survive khi entity bị xóa |
| `ai_conversations` | userId cascade, householdId cascade, title, messages JSONB, context JSONB | Schema xong, **chưa dùng** (chat hiện stateless) |

Enums: `entity_type` (12), `relation_type` (9), `task_status` (4),
`task_priority` (low/medium/high/urgent), `reminder_type` (4),
`reminder_status` (4), `member_role` (3). Giá trị đầy đủ xem schema.ts dòng 17–77.

## 3. Migration workflow

```bash
# Sửa schema.ts xong:
npm run db:generate   # sinh drizzle/XXXX_<name>.sql (review SQL trước khi chạy!)
npm run db:migrate    # apply theo thứ tự, track trong __drizzle_migrations

# Lười cho dev cục bộ (không sinh file):
npm run db:push

# Xem/sửa data bằng GUI:
npm run db:studio
```

`drizzle.config.ts` tự load `.env.local` qua `dotenv` (drizzle-kit không tự
đọc env file). Migration đã apply: `drizzle/0000_flashy_mikhail_rasputin.sql`.

> **Quy tắc:** `db:push` chỉ dùng ở local. Deploy/share luôn dùng
> `generate` + `migrate` để có lịch sử SQL trong git.

## 4. Manual Postgres setup (không Docker)

```bash
# Ubuntu/Debian
sudo apt install postgresql-17
sudo -u postgres psql -c "CREATE USER lifeadmin PASSWORD 'lifeadmin_dev';"
sudo -u postgres psql -c "CREATE DATABASE life_admin_os OWNER lifeadmin;"
# DATABASE_URL=postgresql://lifeadmin:lifeadmin_dev@localhost:5432/life_admin_os
```

## 5. Backup / restore

```bash
# Backup
docker exec life-admin-postgres pg_dump -U lifeadmin life_admin_os > backup-$(date +%F).sql

# Restore (DB trống hoặc chấp nhận ghi đè)
cat backup-xxx.sql | docker exec -i life-admin-postgres psql -U lifeadmin -d life_admin_os

# Reset sạch về 0 (dev): xóa container + volume rồi tạo lại + migrate
docker rm -f life-admin-postgres
# ... chạy lại lệnh docker run ở SETUP, rồi npm run db:migrate
```

## 6. Query debug hay dùng

```bash
P() { docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c "$1"; }
P "SELECT type, name FROM entities;"
P "SELECT type, title, trigger_at::date, status FROM reminders ORDER BY trigger_at;"
P "SELECT actor, action, target_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
P "SELECT fileName, status FROM documents;"  # chú ý: cột camelCase phải quote: P 'SELECT "fileName", status FROM documents;'
```

> Drizzle map camelCase (`fileName`) → cột `"fileName"` trong Postgres.
> Viết SQL tay nhớ **quote** tên cột camelCase.
