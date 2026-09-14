# ROADMAP — Đã xong gì, tiếp theo làm gì

## Đã hoàn thành (2026-09-14, verify end-to-end)

### Bỏ Life Admin OS, dựng lại thành app tiền
- [x] Xoá toàn bộ module life-admin (inbox, life graph, deadlines, tasks, AI chat)
      cùng schema/API/docs cũ
- [x] Bỏ `next-auth`, `@auth/drizzle-adapter`, `date-fns`, `react-day-picker`, `uuid`
- [x] Schema mới 4 bảng + enum `category_kind`, migration `0000`
- [x] Reset DB sạch (drop cả schema `drizzle`) rồi migrate lại

### Nền tảng
- [x] Auth một người dùng: bcrypt + cookie `HttpOnly` ký HMAC-SHA256
      (`src/lib/session-token.ts` test được bằng `node:test`)
- [x] Đăng ký (tự tạo 17 category mặc định trong 1 transaction DB), đăng nhập,
      đăng xuất, đổi mật khẩu
- [x] App shell: sidebar + mobile drawer, dark mode, `loading`/`error`/`not-found`

### Logic tiền (pure function, 29 unit test)
- [x] `amount`: parse/format minor units, VND shorthand (`50k`, `1,5tr`, `2m`),
      currency 0 chữ số thập phân
- [x] `period`: monthKey/monthRange/shiftMonth/daysInMonth/daysElapsed không lệch timezone
- [x] `summary`: tổng thu/chi/net, savings rate, breakdown theo category
- [x] `compare`: delta tháng trước + top 5 movers
- [x] `budget`: ngưỡng tone ok/warn/over + budget lines
- [x] `insights`: 8 rule (savings-rate, budget-over, budget-warn, category-spike,
      top-category, commitments, pace, outlier), sort theo severity

### API + UI
- [x] Mutation: transactions (POST/PATCH/DELETE), categories (POST/PATCH/DELETE),
      budgets (PUT bulk upsert), settings (PATCH + password)
- [x] Trang Overview: số tháng, budget áp lực nhất, 3 insight, hoạt động gần đây
- [x] Trang Transactions: chuyển tháng, filter kind/category/note, nhóm theo ngày,
      thêm/sửa/xoá, gợi ý category theo note đã gõ trước đó
- [x] Trang Categories: hai cột thu/chi, đặt budget ngay trên dòng, archive, xoá
- [x] Trang Review: delta tháng trước, bảng movers, breakdown bằng bar CSS,
      budget vs thực tế, toàn bộ insight
- [x] Trang Settings: profile, currency (khoá khi đã có giao dịch), mật khẩu

### Dữ liệu demo + tài liệu
- [x] `npm run db:seed`: 6 tháng VND, tài khoản `demo@money.local` / `money1234`,
      có tháng chi vượt thu, category spike, budget warn + over, giao dịch bất thường
- [x] Viết lại README + 7 tài liệu trong `docs/`

### Tính năng (đợt 2 — nhập nhanh, định kỳ, dự báo)
- [x] Nhập 1 dòng: `65k ăn trưa`, `+20tr lương` — parse ở client, POST qua endpoint cũ
- [x] Giao dịch định kỳ: bảng `recurring_rules`, sinh khi mở app (không cron),
      chống trùng bằng unique `(userId, recurringId, occurredOn)`, trang `/recurring`
- [x] Dự báo cuối tháng: chiếu theo tốc độ chi + các khoản định kỳ còn lại
- [x] Gợi ý ngân sách từ trung vị (dưới) 3 tháng đã qua, áp dụng từng dòng hoặc tất cả
- [x] Biểu đồ xu hướng 6 tháng + bảng số liệu ở Review
- [x] PWA: manifest + icon sinh bằng script node, cài lên màn hình chính
- [x] `npm run icons` sinh lại icon

## Tiếp theo (để sau, chưa làm)

### Tính năng
- [ ] Ví/tài khoản + số dư, chuyển khoản giữa ví
- [ ] Import CSV sao kê ngân hàng
- [ ] Chụp hoá đơn → tự tạo giao dịch (**cần AI, chỉ làm khi được yêu cầu**)
- [ ] Xuất dữ liệu (CSV/JSON)
- [ ] Nhắc nhở qua email khi vượt budget
- [ ] Nhiều người dùng, chia sẻ household
- [ ] Đa tiền tệ có tỷ giá

### Kỹ thuật
- [ ] Test E2E (đăng nhập → thêm → sửa → xoá → xem Review)
- [ ] Rate limit cho API auth
- [ ] Backup DB định kỳ (script + cron), xem [DATABASE.md](DATABASE.md#4-backup--restore)
- [ ] Dockerfile + compose cho deploy 1 lệnh
- [ ] Kiểm tra `Intl` trên môi trường khác (format tiền có thể khác nhau giữa
      các bản ICU)

## Quyết định đã chốt (đừng làm lại)

- **Không AI** trong insight — mọi con số đều tất định, AI để dành cho việc
  chụp hoá đơn khi được yêu cầu.
- **Không ví/tài khoản** trong v1.
- **Chặn đổi currency khi đã có giao dịch**: tổng tháng cộng theo minor units
  không phân biệt đơn vị, đổi giữa chừng sẽ trộn hai đơn vị.
- **Không có GET API**: đọc bằng server component query trực tiếp.
