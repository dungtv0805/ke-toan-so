---
name: db-deploy
description: Use when deploying backend services or frontend to production server (kt), restarting containers, or checking deployment status
---

# Digital Books — Deploy Skill

## Server Info

- SSH config name: `kt`
- Path: `/root/chimseo/digital-book-be/`
- Container: `digital-book-app` (single container, all 8 services via PM2)
- Ports: 3000-3007 (only 3000 exposed externally)
- Domain: masterceo.com.vn

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
