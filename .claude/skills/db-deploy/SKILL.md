---
name: db-deploy
description: Use when deploying backend services or frontend to production server (kt), restarting containers, or checking deployment status
---

# Digital Books — Deploy Skill

## ⭐ Deploy thường ngày → dùng CI (GitHub Actions), KHÔNG làm tay

File `.github/workflows/deploy.yml` (runner GitHub-hosted, SSH vào server qua secrets `KT_HOST`/`KT_SSH_KEY`).
- **Tự động khi push/merge vào `master`**: tự nhận diện thay đổi → deploy đúng phần:
  - đổi `fe/**` → deploy FE; đổi `be/apps/<svc>/**` → deploy service đó;
  - đổi `be/libs/**` (hoặc package.json/yarn.lock/nest-cli.json/tsconfig) → deploy TẤT CẢ service.
- **Chạy tay**: Actions → "Deploy production" → Run workflow (chọn FE và/hoặc `be_services`).
- CI làm: build → scp `main.js`/`dist` → `docker restart digital-book-app` / nginx reload (đúng các lệnh thủ công bên dưới).

> Điều kiện CI hoạt động: code đã push lên GitHub + đã khai báo secrets (`KT_HOST`, `KT_SSH_KEY`, tuỳ chọn `KT_USER`/`KT_PORT`).

## Khi nào VẪN phải làm THỦ CÔNG (CI chỉ copy code + restart, không đụng thư viện/PM2/DB)

1. **Thêm dependency npm mới (runtime)** → cài vào container + `docker commit` (mục "Khi thêm DEPENDENCY npm MỚI"). CI chỉ đẩy `main.js` → thiếu module → crash.
2. **Thêm microservice MỚI** → sửa `pm2/ecosystem.config.js` + tạo dist + gateway route (mục "Deploy a NEW Microservice").
3. **Cấp quyền cho menu/trang mới** → lệnh Mongo `$addToSet` vào `phan_quyen` + đăng nhập lại (mục ⚠️ phân quyền). CI không chạm database.
4. **Debug / xem log / verify env** trên server (mục Check Logs / Verify Env).
5. CI chưa cấu hình (chưa push / chưa có secrets) → tạm dùng các bước thủ công bên dưới.

> Các mục thủ công bên dưới là nguồn tham chiếu cho 5 trường hợp trên (và là logic mà CI tự động hoá).

## Server Info

- SSH config name: `kt`
- Path: `/root/chimseo/digital-book-be/`
- Container: `digital-book-app` (single container, all services via PM2 — see `pm2/ecosystem.config.js`)
- Ports: 3000-3009 (only 3000 exposed externally; gateway proxies the rest on localhost)
- Domain: masterceo.com.vn
- Services hiện có: gateway(3000), auth(3001), master-data(3002), voucher(3003), cash-book(3004), payable(3005), reporting(3006), config(3007), kho(3008), tax(3009)

## ⚠️ Khi thêm MENU/PAGE mới — BẮT BUỘC khai báo PHÂN QUYỀN (nếu thiếu, trang bị ẩn/chặn với mọi role trừ superAdmin)

Quyền dạng `"<route>:<action>"` (action: `xem|them|sua|xoa|xuat`). superAdmin (`admin@company.com`) bypass tất cả; role công ty (vd "Admin") lấy quyền từ collection `phan_quyen` → nạp vào JWT lúc login. Xem chi tiết khai báo trong skill `db-fe`. Tóm tắt 4 bước (đã verify khi thêm menu Thuế 2026-06-25):

1. **Khai báo quyền — sửa 3 file** (thiếu → không hiện trong ma trận Phân quyền + bị chặn):
   - FE `fe/src/config/routePermissions.ts` (map `'<route>': '<route>:xem'`)
   - FE `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` (node cây — PHẢI KHỚP BE)
   - BE `be/apps/master-data-service/src/tenant/tenant.service.ts` → `PERMISSION_MODULES`
   - (Menu: `MainLayout.tsx` + `menuCatalog.ts`; thêm route vào `existingRoutes` để bỏ nhãn "coming soon".)
2. **Deploy:** build + đẩy `master-data-service` (restart) + FE (reload nginx).
3. **Cấp quyền cho role ĐÃ CÓ** — `generateAllPermissions` chỉ chạy lúc tạo tenant, role "Admin" cũ KHÔNG tự có quyền mới → $addToSet vào `phan_quyen` (container Mongo tên `mongo`):
   ```bash
   ssh kt "docker exec mongo mongosh 'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet --eval '
   var mods=[\"/<route1>\",\"/<route2>\"]; var acts=[\"xem\",\"them\",\"sua\",\"xoa\",\"xuat\"];
   var keys=[]; mods.forEach(function(m){acts.forEach(function(a){keys.push(m+\":\"+a)})});
   var r=db.phan_quyen.updateMany({vaiTro:\"Admin\"},{\$addToSet:{permissions:{\$each:keys}}});
   print(\"modified=\"+r.modifiedCount);'"
   ```
   (Role khác cấp chọn lọc trong trang Phân quyền.)
4. **Đăng xuất/đăng nhập lại** — quyền nạp vào JWT lúc login.

## ⚠️ Khi thêm DEPENDENCY npm MỚI (runtime) — BẮT BUỘC đọc

`nest build` (webpack) **externalize** node_modules — `main.js` chỉ `require("pkg")`, KHÔNG bundle. Image `localhost/digital-book:latest` chứa sẵn `/app/node_modules` (baked vào image, KHÔNG phải volume). Vì vậy thêm dep mới mà chỉ scp `main.js` → container crash-loop `Cannot find module`.

Quy trình thêm dep mới (đã verify 2026-06-22 khi thêm nest-winston/winston):
```bash
# 1. Cài vào node_modules trong container (legacy-peer-deps vì typeorm/mongodb conflict sẵn có)
ssh kt 'docker exec digital-book-app sh -c "cd /app && npm install --no-save --no-package-lock --legacy-peer-deps <pkg>@<ver> ..."'
# 2. Restart PM2 để nạp lại
ssh kt 'docker exec digital-book-app pm2 restart all'
# 3. PERSIST: commit container thành image (nếu không, docker compose up -d sẽ mất dep)
ssh kt 'docker commit digital-book-app localhost/digital-book:latest'
# 4. Verify image mới có dep
ssh kt 'docker run --rm --entrypoint sh localhost/digital-book:latest -c "ls /app/node_modules/<pkg>"'
```
Container chạy user `nestjs` uid=1001 gid=65533. `/app/node_modules` writable bởi uid này.

## Đọc log nhanh trên server (chưa có Loki)
Có script `logs.sh` tại `/root/chimseo/digital-book-be/logs.sh` (source: `be/scripts/logs.sh`), cần `jq`:
```bash
cd /root/chimseo/digital-book-be
./logs.sh trace <requestId>     # gom log 1 request qua mọi service (theo thời gian)
./logs.sh errors                # theo dõi mọi LỖI live
./logs.sh tail voucher          # xem live 1 service (file ngày mới nhất)
./logs.sh grep " - 500 - "      # tìm theo chuỗi (status/path...)
./logs.sh services              # liệt kê service có log
```
File log JSON nằm ở `logs/{service}-YYYY-MM-DD.log` (+ `-error-`). Có thể grep thẳng: `grep -h "<requestId>" logs/*.log`.

## Ghi log ra file (Winston) — volume + quyền
- Env `LOG_DIR=/app/logs` (trong `env/services.env`), volume `./logs:/app/logs` (trong `docker-compose.yml`).
- Đổi volume cần **`docker compose up -d`** (recreate), KHÔNG phải `docker restart`.
- Host `logs/` phải thuộc uid container: `chown -R 1001:65533 /root/chimseo/digital-book-be/logs` — nếu không sẽ `EACCES` khi winston ghi file.

## Deploy Backend Service

```bash
# 1. Build specific service locally
cd /Users/chimseo/code/digital-books/be
npx nest build {service-name}

# 2. Upload built file
scp dist/apps/{service-name}/main.js kt:/root/chimseo/digital-book-be/dist/apps/{service-name}/main.js

# 3. Restart container
ssh kt "docker restart digital-book-app"

# 4. Verify service is running
ssh kt "docker logs digital-book-app --tail 20"
```

## Deploy a NEW Microservice (lần đầu)

Khi thêm 1 service mới (vd `kho-service` port 3008) — KHÔNG chỉ upload `main.js` như service đã có, vì PM2 chưa biết service này và dist/apps chưa có thư mục. Các bước (đã verify khi deploy kho-service):

```bash
# 0. Build local: service mới + gateway (có route mới) + service danh mục liên quan (nếu có)
cd <repo>/be
npx nest build kho-service && npx nest build gateway && npx nest build master-data-service

# 1. Tạo thư mục dist cho service mới trên server + upload main.js
ssh kt "mkdir -p /root/chimseo/digital-book-be/dist/apps/kho-service"
scp dist/apps/kho-service/main.js     kt:/root/chimseo/digital-book-be/dist/apps/kho-service/main.js
scp dist/apps/gateway/main.js         kt:/root/chimseo/digital-book-be/dist/apps/gateway/main.js
scp dist/apps/master-data-service/main.js kt:/root/chimseo/digital-book-be/dist/apps/master-data-service/main.js

# 2. Thêm entry vào PM2 ecosystem (backup trước). Thêm 1 app vào mảng apps:
#    { name: "kho-service", script: "dist/apps/kho-service/main.js", env: { PORT: 3008 } }
ssh kt "cp /root/chimseo/digital-book-be/pm2/ecosystem.config.js /root/chimseo/digital-book-be/pm2/ecosystem.config.js.bak"
# rồi sửa file (scp file mới đè, hoặc sửa trực tiếp). ecosystem.config.js được mount volume vào container.

# 3. Restart container — PM2 đọc lại ecosystem và khởi động service mới
ssh kt "docker restart digital-book-app"

# 4. Verify service mới online + routes + Mongo
ssh kt "docker exec digital-book-app pm2 list"                       # service mới phải 'online'
ssh kt "docker logs digital-book-app --tail 250 2>&1 | grep -i 'kho service is running'"
ssh kt "curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/<prefix>/...'"  # 401 = route OK (không phải 404)
```

**Lưu ý quan trọng:**
- **Gateway route**: service mới phải được khai báo trong `apps/gateway/src/environments/environment.ts` (`services` map + `routes` array). Gateway dùng default `localhost:<port>` trong cùng container — KHÔNG cần thêm vào `services.env` (services.env `_URL` chỉ cho ServiceClient giữa các service).
- **Gateway có global prefix `/api`** + **stripPrefix**: FE gọi `/api/kho/phieu` → gateway strip `/kho` → forward `/phieu`. Vì vậy controller phải là `@Controller('phieu')` (KHÔNG `@Controller('kho')`), nếu không sẽ **404**. Test bằng `curl` localhost:3000 phải có `/api` prefix mới ra 401; không prefix ra 404 là bình thường.
- **Port**: main.ts của service đọc `<SVC>_SERVICE_PORT || <port>`; PM2 set `PORT` (không phải `<SVC>_SERVICE_PORT`) nên service chạy theo default trong main.ts — đảm bảo default đúng port.
- `docker-compose.yml` mount `./dist` và `./pm2/ecosystem.config.js` làm volume → sửa trên host là container thấy ngay sau restart. KHÔNG cần rebuild image cho service mới.

## Deploy Frontend

FE served by container `digital-book-nginx` (volume mount: host `/root/chimseo/nginx/build4/` → container `/usr/share/nginx/html/build4`)

```bash
# 1. Build
cd /Users/chimseo/code/digital-books/fe
npm run build

# 2. Upload to host (volume-mounted into nginx container)
scp -r dist/* kt:/root/chimseo/nginx/build4/

# 3. Reload nginx inside container (pick up new files)
ssh kt "docker exec digital-book-nginx nginx -s reload"
```

**Note:** Nếu volume mount bị mất sync, dùng docker cp trực tiếp vào container:
```bash
# Alternative: copy directly into container
ssh kt "docker cp /root/chimseo/nginx/build4/. digital-book-nginx:/usr/share/nginx/html/build4/"
ssh kt "docker exec digital-book-nginx nginx -s reload"
```

## Verify Env (IMPORTANT — check before debugging issues)

Env thay đổi nhiều lần gây lỗi vặt. Luôn verify env đúng trước khi debug:

```bash
# Check services.env (inter-service URLs)
ssh kt "cat /root/chimseo/digital-book-be/env/services.env"
# Expected:
# AUTH_SERVICE_URL=http://localhost:3001
# MASTER_DATA_SERVICE_URL=http://localhost:3002
# VOUCHER_SERVICE_URL=http://localhost:3003
# CASH_BOOK_SERVICE_URL=http://localhost:3004
# PAYABLE_SERVICE_URL=http://localhost:3005
# REPORTING_SERVICE_URL=http://localhost:3006
# CONFIG_SERVICE_URL=http://localhost:3007

# Check db.env
ssh kt "cat /root/chimseo/digital-book-be/env/db.env"
# Expected:
# MONGODB_URI=mongodb://dbadmin:abcde12345-@mongo:27017/?authSource=admin
# MONGODB_DATABASE=digital_book

# Check jwt.env
ssh kt "cat /root/chimseo/digital-book-be/env/jwt.env"
```

**Lưu ý quan trọng:**
- services.env dùng format `_URL` (e.g. `VOUCHER_SERVICE_URL=http://localhost:3003`)
- ServiceClient parse URL format này — nếu ai đổi sang `_HOST`/`_PORT` sẽ gây lỗi
- MongoDB host là `mongo` (docker network name), KHÔNG phải `localhost`
- Nếu env bị thay đổi → restart container: `docker restart digital-book-app`

## Check Logs

```bash
# Recent logs
ssh kt "docker logs digital-book-app --tail 100"

# Follow logs (for debugging)
ssh kt "docker logs digital-book-app -f --tail 50"

# Filter by service
ssh kt "docker logs digital-book-app --tail 200 2>&1 | grep -i reporting"
```

## Server File Structure

```
kt:/root/chimseo/
├── digital-book-be/
│   ├── dist/apps/{service-name}/main.js
│   ├── docker-compose.yml
│   ├── env/
│   │   ├── db.env
│   │   ├── jwt.env
│   │   └── services.env
│   └── pm2/ecosystem.config.js
├── mongo/
└── nginx/
    └── build4/  ← FE deploy target
```

## Common Issues

- **rsync fails with "unexpected end of file"**: Use `scp` instead
- **Service not starting**: Check `docker logs` for startup errors
- **Env var issues**: Check `env/services.env` for URL format
- **Port conflicts**: All services must use their assigned ports (3000-3007)

## Post-Deploy Verification

1. Check container is running: `ssh kt "docker ps | grep digital-book"`
2. Check logs for errors: `ssh kt "docker logs digital-book-app --tail 30 2>&1 | grep -i error"`
3. Test endpoint: `ssh kt "curl -s http://localhost:{port}/health || echo 'no health endpoint'"`
4. Test from browser: navigate to relevant page on masterceo.com.vn
