# DEVELOPMENT — Workflow & conventions

## 1. Vòng lặp dev hằng ngày

```bash
# Terminal 1: DB (chỉ lần đầu hoặc sau reboot)
docker start life-admin-postgres

# Terminal 2: app
npm run dev        # http://localhost:3000
```

Sửa code → Fast Refresh tự reload. Sửa `schema.ts` → chạy
`db:generate` + `db:migrate` (xem [DATABASE.md](DATABASE.md#3-migration-workflow)).

## 2. Thêm 1 page dashboard mới

1. Tạo `src/app/(dashboard)/ten-trang/page.tsx` (async Server Component).
2. Đầu hàm: `const session = await requireAuth();` (từ `@/lib/session`).
3. Resolve household: copy mẫu `db.query.householdMembers.findFirst(...)`
   trong `(dashboard)/page.tsx` — **luôn scope query theo `householdId`**.
4. Thêm link vào mảng `navigation` trong `src/components/layout/navigation.tsx`.
5. UI: dùng component shadcn có sẵn (`src/components/ui/*`); icon `lucide-react`.

## 3. Thêm 1 API route mới

1. Tạo `src/app/api/<ten>/route.ts`, export `GET/POST/...`.
2. Mẫu chuẩn:
   ```ts
   const session = await auth();
   if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   // resolve membership → householdId → query scoped
   ```
3. Action nguy hiểm (gửi mail, xóa, tiền bạc): gọi `canExecuteAction()`
   từ `lib/policy-engine.ts` trước khi chạy, log qua `createAuditLog()`.
4. Ghi endpoint mới vào [API.md](API.md).

## 4. Thêm 1 AI provider thật

1. Tạo class implement `AIProvider` (`extract/chat/embed`) trong `src/lib/ai/`,
   theo mẫu `MockProvider` ở `src/lib/ai/provider.ts`.
2. Đăng ký trong `createAIProvider()` switch theo `AI_PROVIDER` env.
3. Thêm key vào `.env.example` + `.env.local`. Không commit key thật.
4. Nội dung upload là **DATA, không phải instruction** — không bao giờ đưa
   text từ file vào system prompt dưới dạng chỉ thị (chống prompt injection).

## 5. Conventions (bắt buộc theo)

- TypeScript strict: `npx tsc --noEmit` phải sạch trước khi coi như xong việc.
- Không `any` mới; JSONB cast tường minh (`as Record<string, unknown>`).
- Server Components mặc định; `"use client"` chỉ khi cần state/event.
- Xóa mềm (`archivedAt`) thay vì DELETE vật lý với entities.
- Không tin input client: validate type/size file, enum entityType,
  household luôn resolve server-side.
- Confidence < 0.7 → UI bắt user verify (mẫu: `inbox-upload.tsx` highlight vàng).
- Mỗi PR/thay đổi lớn: cập nhật docs tương ứng (API mới → API.md, bảng mới → DATABASE.md).

## 6. Cấu trúc thư mục cần nhớ

```
src/app/(auth)/          public (login/register)
src/app/(dashboard)/     cần session (layout check + redirect)
src/app/api/             REST handlers, mỗi route.ts tự auth
src/components/ui/       shadcn (đừng sửa tay — dùng `npx shadcn add`)
src/components/<domain>/ inbox, entities, tasks, ai, home, layout, auth
src/lib/db/schema.ts     NGUỒN SỰ THẬT của DB — sửa đây rồi generate
src/lib/ai/              provider interface + agents
src/types/index.ts       EntityType, RelationType, ENTITY_TYPE_CONFIG
drizzle/*.sql            lịch sử migration (commit cùng schema)
scripts/                 fix-native-bindings.sh (postinstall)
uploads/                 file user upload (gitignored, backup riêng)
```

## 7. Nợ kỹ thuật đã biết (đừng ngạc nhiên)

- Task checkbox chỉ đổi state local, chưa PATCH xuống DB.
- Settings inputs chưa lưu (chưa có handler).
- `policy-engine` viết xong chưa route nào dùng.
- `aiConversations` có bảng nhưng chat stateless.
- Entity detail chỉ xem attributes + sửa name/description qua dialog; chưa sửa
  từng attribute trên detail page (dùng PATCH API để merge).
- Chưa có UI xem/khôi phục entity đã archive (query tay hoặc PATCH `archived:false`).
