# API — Toàn bộ endpoints

Base: `http://localhost:3000` (dev). Auth = cookie session NextAuth
(`authjs.session-token`). Mọi response lỗi đều dạng `{"error": "..."}`.

Quy ước chung: mọi route (trừ auth) yêu cầu session → 401 nếu chưa login;
resolve `householdId` từ membership của user → 400 nếu chưa có household.

## Auth

| Method | Path | Body | Response |
| ------ | ---- | ---- | -------- |
| POST | `/api/auth/register` | `{name, email, password}` (pass ≥ 8 ký tự ở UI) | 201 `{message}` · 400 email tồn tại/thiếu field |
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth: signin/callback/session/csrf/providers |
| — | `/api/auth/session` | — | `{user:{id,name,email,image}}` hoặc `null` |

Login credentials dùng NextAuth callback (form-encoded, cần csrfToken):

```bash
# Lấy csrf + cookie
curl -s -c cj.txt http://localhost:3000/api/auth/csrf
# Login (thay CSRF_TOKEN)
curl -s -b cj.txt -c cj.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  --data-urlencode "email=a@b.com" --data-urlencode "password=secret123" \
  --data-urlencode "csrfToken=CSRF_TOKEN" -o /dev/null -w "%{http_code}\n"
# => 302 + set-cookie authjs.session-token là thành công
```

## Inbox & files

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| GET | `/api/inbox` | — | `{documents: [...]}` (20 mới nhất) |
| POST | `/api/inbox` | multipart `file` (pdf/jpg/png/webp/heic/doc/docx/txt, ≤10MB) | `{message, document, extraction}` · 400 sai type/quá size |
| POST | `/api/inbox/confirm` | JSON (dưới) | 201 `{message, entity, remindersCreated}` · 404 sai doc · 409 đã confirm |
| GET | `/api/files/[name]` | `<uuid>-<filename>` | Binary + `Content-Type` gốc · 401/404 |

`/api/inbox/confirm` body:

```json
{
  "documentId": "uuid",
  "entityType": "warranty",
  "name": "Samsung TV warranty",
  "description": "optional",
  "fields": {
    "expiryDate": {"value": "2027-03-11", "confidence": 0.9, "source": "user_confirmed"}
  },
  "suggestedRelations": []
}
```

Logic sinh reminders (chỉ ngày tương lai): `expiryDate|endDate|dueDate|
renewalDate...` → deadline đúng ngày + prep trước 30 ngày + prep trước 7 ngày;
`returnDeadline|returnWindowEnd` → deadline riêng.

## Entities

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| GET | `/api/entities?type=warranty` | query `type` optional | `{entities: [...]}` kèm outgoing/incoming relations |
| POST | `/api/entities` | `{type, name, description?, attributes?, relations?[]}` | 201 `{entity}` |
| GET | `/api/entities/[id]` | — | `{entity}` kèm relations, documents, tasks, reminders |
| PATCH | `/api/entities/[id]` | `{name?, description?, attributes?, archived?}` | `{entity}` — attributes **merge**; `archived:true/false` để archive/restore |
| DELETE | `/api/entities/[id]` | query `permanent=true` optional | Archive (mặc định) `{entity, archived:true}`; `?permanent=true` xóa hẳn |

`relations[]`: `{toEntityId, relationType, metadata?}`.

## Entity relations

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| POST | `/api/entity-relations` | `{fromEntityId, toEntityId, relationType, metadata?}` | 201 `{relation}` · 400 self-link/invalid · 404 entity ngoài household · 409 đã tồn tại |
| DELETE | `/api/entity-relations?id=<relId>` | — | `{message}` · 404 nếu không thuộc household |

## Reminders

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| GET | `/api/reminders?status=scheduled` | query `status` optional | `{reminders: [...]}` kèm entity, sort theo triggerAt |
| PATCH | `/api/reminders/[id]` | `{status?}` hoặc `{snoozeDays?}` | `{reminder}` — snooze dời `triggerAt` + về `scheduled` |

`status`: `scheduled` \| `sent` \| `dismissed` \| `snoozed`. `snoozeDays` số dương (1/7/30).

## Tasks

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| GET | `/api/tasks` | — | `{tasks: [...]}` |
| POST | `/api/tasks` | `{title, description?, priority?, dueDate?, entityId?, reminderId?}` | 201 `{task}` |
| PATCH | `/api/tasks/[id]` | `{title?, description?, status?, priority?, dueDate?}` | `{task}` |
| DELETE | `/api/tasks/[id]` | — | `{message}` |

- `reminderId`: tạo task từ reminder → kế thừa `entityId` + `dueDate`, set
  `reminders.taskId` và chuyển reminder sang `dismissed`.
- `status`: `pending` \| `in_progress` \| `completed` \| `cancelled`
  (`completed` tự set `completedAt`).
- `priority`: `low` \| `medium` \| `high` \| `urgent`.

## AI

| Method | Path | Input | Response |
| ------ | ---- | ----- | -------- |
| POST | `/api/ai/chat` | `{message}` | `{response}` (hiện tại = mock) |

## Quick test script (verify máy mới)

```bash
B=http://localhost:3000
curl -s -c cj.txt $B/api/auth/csrf > /dev/null
CSRF=$(curl -s $B/api/auth/csrf | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).csrfToken))")
curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"T","email":"t@t.com","password":"password123"}'; echo
curl -s -b cj.txt -c cj.txt -X POST $B/api/auth/callback/credentials \
  --data-urlencode "email=t@t.com" --data-urlencode "password=password123" \
  --data-urlencode "csrfToken=$CSRF" -o /dev/null -w "login:%{http_code}\n"
echo "SAMSUNG RECEIPT 899.99 warranty 2 years" > /tmp/r.txt
DOC=$(curl -s -b cj.txt -X POST $B/api/inbox -F "file=@/tmp/r.txt;type=text/plain" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).document.id))")
echo "doc:$DOC"
curl -s -b cj.txt -X POST $B/api/inbox/confirm -H 'Content-Type: application/json' \
  -d "{\"documentId\":\"$DOC\",\"entityType\":\"warranty\",\"name\":\"TV\",\"fields\":{\"expiryDate\":{\"value\":\"2027-03-11\",\"confidence\":0.9,\"source\":\"test\"}}}"; echo
curl -s -b cj.txt "$B/api/entities?type=warranty" | head -c 300; echo
```

## Chưa có (để roadmap)

- `GET /api/search?q=` (semantic + structured)
- `GET /api/brief/weekly` (Weekly Life Brief)
- `POST /api/household/members` (mời member)
