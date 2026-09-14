# SETUP — Dựng máy mới từ A–Z

## 1. Yêu cầu

- Node.js 22+ (dùng `node:test` và `--experimental-strip-types`)
- Docker (hoặc Postgres 17 cài trực tiếp, xem §5)
- npm

## 2. Cài dependency

```bash
npm install
```

**Windows:** npm sẽ chặn các package pin cho Linux (`EBADPLATFORM`), chạy:

```bash
npm install --include=optional --force
```

`postinstall` chạy `scripts/fix-native-bindings.sh` để đặt lại binary native.
Nếu script này báo lỗi `set: -: invalid option`, file đang bị CRLF — xem
[TROUBLESHOOTING](TROUBLESHOOTING.md#postinstall-lỗi-trên-windows).

## 3. Database

```bash
docker run -d --name life-admin-postgres --restart unless-stopped \
  -e POSTGRES_USER=lifeadmin -e POSTGRES_PASSWORD=lifeadmin_dev \
  -e POSTGRES_DB=life_admin_os -p 5433:5432 postgres:17-alpine
```

Kiểm tra: `docker exec life-admin-postgres psql -U lifeadmin -d life_admin_os -c '\dt'`

## 4. Env

```bash
cp .env.example .env.local
```

```
DATABASE_URL=postgresql://lifeadmin:lifeadmin_dev@localhost:5433/life_admin_os
SESSION_SECRET=<openssl rand -base64 32>
```

Lưu file **không BOM**. Nếu BOM, `npm run db:seed` sẽ chết với
`DATABASE_URL is not set` — xem [TROUBLESHOOTING](TROUBLESHOOTING.md#env-local-có-bom).

## 5. Postgres không Docker (tuỳ chọn)

```bash
sudo apt install postgresql-17
sudo -u postgres psql -c "CREATE USER lifeadmin PASSWORD 'lifeadmin_dev';"
sudo -u postgres psql -c "CREATE DATABASE life_admin_os OWNER lifeadmin;"
# đổi cổng trong DATABASE_URL thành 5432
```

## 6. Migration + dữ liệu demo

```bash
npm run db:migrate
npm run db:seed      # in ra tài khoản demo ở cuối
npm run dev
```

Mở `http://localhost:3000`, đăng nhập `demo@money.local` / `money1234`.

## 7. Checklist verify

- [ ] `docker ps` thấy `life-admin-postgres` đang chạy
- [ ] `npm run db:migrate` báo `migrations applied successfully`
- [ ] `npm run db:seed` in ra 6 tháng dữ liệu và tài khoản demo
- [ ] `npm test` — 29 test pass
- [ ] `npm run lint` — 0 error
- [ ] `npx tsc --noEmit` — sạch
- [ ] `npm run build` — xanh
- [ ] Đăng nhập được bằng tài khoản demo
- [ ] `/review` hiển thị insight (savings rate, budget, spike, commitments, pace, outlier)
- [ ] Đổi theme sáng/tối, refresh vẫn giữ theme
