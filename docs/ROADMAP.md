# ROADMAP — Đã xong gì, tiếp theo làm gì

## Đã hoàn thành (đã verify end-to-end)

### Phase 1 — Foundation
- [x] Next.js 16 + TS strict + Tailwind v4 + shadcn/ui
- [x] Drizzle schema 10 bảng (Life Admin Graph) + migration đầu tiên
- [x] NextAuth v5: credentials (bcrypt) + Google optional, JWT session
- [x] Đăng ký tự tạo household + role admin; mọi query scope household
- [x] Navigation shell 6 trang (Home/Inbox/Life/Tasks/AI/Settings) + mobile nav

### Phase 2 — Inbox thật
- [x] Upload persist disk (`src/lib/storage.ts`, validate type/size)
- [x] CaptureAgent + MockProvider (fixture để test không cần key)
- [x] Review UI: sửa field, chọn entity type, highlight confidence < 0.7
- [x] Confirm → entity + auto-reminders (deadline/prep-30d/prep-7d) + audit log
- [x] File serving scope household (`/api/files/[name]`), chống double-confirm (409)
- [x] Verify: upload → confirm → entity + 3 reminders + 2 audit rows

### Hạ tầng / môi trường
- [x] Postgres 17 container riêng (`life-admin-postgres`, port 5433)
- [x] Workaround npm optional-deps bug (pin binary + postinstall script)
- [x] Build webpack xanh, typecheck sạch

## Tiếp theo (theo thứ tự đề xuất)

### Phase 3 — Life Graph browser
- [x] Entity detail page (`/life/[type]/[id]`): attributes, documents, deadlines, relations
- [x] Tạo entity thủ công (dialog form + attribute key-value động)
- [x] PATCH entity (sửa name/description/attributes, merge attributes)
- [x] Archive/restore entity (xóa mềm) + ẩn khỏi list
- [x] API + UI tạo/xóa relation giữa 2 entity (chống trùng → 409)
- [x] Fix root `src/app/page.tsx`: xóa file mặc định trùng route với `(dashboard)/page.tsx`
- [ ] Task templates (warranty claim, cancellation, renewal review)
- [ ] Sửa attributes trực tiếp trên detail page (hiện chỉ xem + dialog sửa name/desc)

### Phase 4 — Deadline engine UI
- [x] Trang `/deadlines`: timeline nhóm theo Overdue / This week / This month / Later
- [x] Consequence ("what happens if I do nothing") hiển thị từ `reminder.message`
- [x] Snooze 1 ngày / 1 tuần / 1 tháng + dismiss reminder (PATCH status/triggerAt)
- [x] Reminder → task: nút Task tạo task kế thừa entity + dueDate, dismiss reminder
- [x] Task persistence: checkbox toggle, sửa priority/dueDate, cancel/delete
- [x] Nút "New Task" (dialog), link task ↔ entity
- [x] Fix bug schema: 3 cột `tasks` cùng map `user_id` → tách `assignee_id`/`owner_id`/`created_by`
- [ ] Reopen reminder đã dismiss (hiện dismiss xong ẩn khỏi list)
- [ ] Timeline/calendar dạng lịch tháng (hiện là danh sách nhóm)

### Phase 5 — AI thật
- [ ] **AI provider thật**: `ClaudeProvider` hoặc `OpenAIProvider` implement
      `AIProvider` (extract/chat/embed) — thay `AI_PROVIDER=mock`
- [ ] Vision/PDF extraction (thay placeholder trong `storage.ts`)
- [ ] Hiểu intent NL → graph query ("subscription nào trên $50?")
- [ ] Weekly Life Brief + Life Admin Score theo Impact×Urgency×Risk×Confidence
- [ ] Persist `ai_conversations` (bảng có sẵn, chat đang stateless)

### Phase 6 — Tasks & household
- [ ] Persist task toggle (PATCH status + completedAt)
- [ ] Assign/owner, workflow templates (claim bảo hành, hủy sub)
- [ ] Mời member vào household (hiện chỉ 1 user/household)
- [ ] Cắm `policy-engine` vào mọi external/high-impact action

### Production-hardening (trước khi public)
- [ ] S3 (hoặc R2) thay upload local + virus scan
- [ ] Rate limit API AI/upload, CSRF/validation rà soát
- [ ] Auth secret rotation, Google OAuth production keys
- [ ] Backup DB định kỳ (script + cron), xem [DATABASE.md](DATABASE.md#5-backup--restore)
- [ ] Tests: unit (policy, deadline calc) + E2E (upload→confirm→view)
- [ ] Dockerfile + compose (app + postgres) cho deploy 1 lệnh

## Plan gốc

Spec sản phẩm đầy đủ (40 mục, tầm nhìn Remember→Understand→Recommend→Act) đã
được copy vào repo: [`docs/SPEC.md`](SPEC.md).
