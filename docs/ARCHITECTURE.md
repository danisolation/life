# ARCHITECTURE — Kiến trúc hệ thống

## 1. Tổng quan

```
Browser (React 19, shadcn/ui, Tailwind v4)
  │  Server Components + Client Components + fetch API
  ▼
Next.js 16 App Router (Turbopack dev / webpack build)
  ├─ (auth)/login, /register          — public
  ├─ (dashboard)/, /inbox, /life, /tasks, /ai, /settings — cần session
  └─ /api/*                            — REST JSON, session cookie
       │
       ▼
Lib layer (src/lib)
  ├─ db/            Drizzle client + schema (Postgres)
  ├─ auth.ts        NextAuth config (JWT strategy)
  ├─ session.ts     requireAuth() / getCurrentUserId() helpers
  ├─ storage.ts     Upload local disk + validate
  ├─ ai/            AIProvider interface + CaptureAgent (mock)
  ├─ policy-engine.ts  canExecuteAction() — ĐÃ VIẾT, CHƯA DÙNG
  └─ audit.ts       createAuditLog()
```

## 2. Luồng chính: Inbox → Graph (đã chạy thật)

```
User upload file
  → POST /api/inbox
      validate (type, size) → storeFile() → ./uploads/<uuid>-<name>
      → documents row (status=processing)
      → CaptureAgent.processDocument() → MockProvider.extract()
      → documents.extractedData + confidence + status=completed
      → audit_logs (CaptureAgent/document_uploaded)
  → UI hiện extraction, user sửa từng field + chọn entity type + tên
  → POST /api/inbox/confirm
      tạo entities row (attributes = fields đã confirm)
      → documents.entityId = entity.id (link 1-1)
      → sinh reminders (expiry → deadline + prep-30d + prep-7d;
                        return window → deadline) — chỉ ngày trong tương lai
      → audit_logs (User:<id>/document_confirmed)
```

Quy tắc confirm: `document.entityId` đã set → 409 (chống double-submit).
Mọi query đều scope `householdId` từ membership của session.

## 3. Auth & multi-tenancy

- **NextAuth v5 beta**, `strategy: "jwt"`, DrizzleAdapter.
- Providers: Credentials (bcrypt, cost 12) + Google (optional, tắt khi thiếu env).
- `session.user.id` được augment qua `src/types/next-auth.d.ts`.
- Đăng ký (`POST /api/auth/register`): tạo `users` → tạo `households`
  (`"<name>'s Household"`) → `household_members` role `admin`.
- Mọi bảng domain đều có `householdId`; API nào cũng resolve household từ
  `householdMembers(userId)` trước khi query. **Không bao giờ tin `householdId`
  từ client.**

## 4. Life Admin Graph (data model)

Bảng đa hình `entities(type, attributes JSONB)` + `entity_relations`
xem chi tiết [DATABASE.md](DATABASE.md).

Entity types: `asset, subscription, warranty, purchase, receipt, bill,
contract, deadline, task, provider, person, document`.
Relation types: `HAS_WARRANTY, HAS_RECEIPT, PAID_BY, PROVIDED_BY, BELONGS_TO,
REMINDER_FOR, DEPENDS_ON, EXTENDS, CANCELS`.

Relations giữa 2 entity tạo qua `POST /api/entity-relations` (UI ở entity
detail page). Entity archive bằng `archivedAt` (xóa mềm) — list `/life` lọc
`isNull(archivedAt)`; xóa vĩnh viễn cần `DELETE ?permanent=true`.

## 5. AI layer (hiện tại = mock)

- `AIProvider` interface: `extract()`, `chat()`, `embed()`.
- `MockProvider` trả fixture cố định (Demo Store, $299.99...) — đủ để test
  toàn bộ pipeline mà không cần key.
- Đổi provider qua `AI_PROVIDER` env. Viết `ClaudeProvider`/`OpenAIProvider`
  implement cùng interface là cắm vào được ngay (xem [ROADMAP.md](ROADMAP.md#ai-provider-thật)).
- Text extract thật cho `.txt`; PDF/ảnh trả placeholder nói rõ cần provider
  có vision (không bịa dữ liệu — đúng triết lý confidence trong spec).

## 6. Policy engine & audit

- `policy-engine.ts`: `AutonomyLevel` 0–4 + `canExecuteAction()` (role →
  max level, high-impact/external/irreversible → bắt confirm). **Đã viết,
  chưa được route nào gọi** — việc tiếp theo khi thêm action nguy hiểm.
- `audit.ts`: mọi AI/user action quan trọng ghi `audit_logs`
  (actor, action, target, reason, source, confidence×100, metadata).
  Đã dùng ở upload + confirm.

## 7. Pages & components

| Route | File | Ghi chú |
| ----- | ---- | ------- |
| `/` | `(dashboard)/page.tsx` | Health score, priority actions, stats, deadlines |
| `/inbox` | `(dashboard)/inbox/page.tsx` | `InboxUpload` + `InboxItems` |
| `/life` | `(dashboard)/life/page.tsx` | Gom entity theo type + nút New Item |
| `/life/[type]/[id]` | `(dashboard)/life/[type]/[id]/page.tsx` | Detail: attributes, documents, deadlines, relations |
| `/tasks` | `(dashboard)/tasks/page.tsx` | List + checkbox local (chưa persist) |
| `/ai` | `(dashboard)/ai/page.tsx` | Chat UI → mock response |
| `/settings` | `(dashboard)/settings/page.tsx` | Profile, household, permissions (chưa save) |
| `/login`, `/register` | `(auth)/` | Public, redirect vào `/` nếu đã login |

`src/app/page.tsx` (root) hiện tại là file mặc định của create-next-app —
cân nhắc redirect về `/` hoặc landing page sau.

## 8. Quyết định kỹ thuật đã chốt

1. **Postgres + JSONB** thay vì graph DB: quan hệ đơn giản, recursive CTE đủ dùng.
2. **Drizzle** thay vì Prisma: nhẹ, SQL-gần, migrate bằng SQL thuần.
3. **JWT session** thay vì database session: ít query, đủ cho MVP.
4. **Upload local** thay vì S3: MVP single-server; tách `storage.ts` để sau
   thay backend không đụng API.
5. **Build webpack** (`build --webpack`): Turbopack sandbox không resolve được
   native `.node` bindings trong môi trường hiện tại.
6. **`.npmrc` `omit=optional` + pin binary Linux x64**: workaround bug npm —
   xem [TROUBLESHOOTING.md](TROUBLESHOOTING.md#npm-optional-deps).
