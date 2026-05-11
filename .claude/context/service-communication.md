# Service Communication — Inter-Service HTTP Calls

## Architecture Overview

```
Frontend → Gateway (:3000) → strip prefix → forward to target service
                                          ↓
Reporting Service (:3006) → ServiceClient (HTTP) → Voucher Service (:3003)
                          → ServiceClient (HTTP) → Master Data Service (:3002)
```

## ServiceClient (libs/service-client/src/)

### Config Resolution
ServiceClient resolve service URL từ env vars theo thứ tự:
1. `{PREFIX}_SERVICE_URL` (e.g. `VOUCHER_SERVICE_URL=http://localhost:3003`) — parse hostname + port từ URL
2. `SERVICE_{PREFIX}_HOST` + `SERVICE_{PREFIX}_PORT` — individual vars
3. `{PREFIX}_SERVICE_HOST` + `{PREFIX}_SERVICE_PORT` — alternative format
4. Fallback: `localhost:3000`

**QUAN TRỌNG:** Server production dùng format `_URL` (file `env/services.env`). Fix đã được apply vào `service-client.base.ts` để parse URL format.

### Env vars trên production (docker container)
```
AUTH_SERVICE_URL=http://localhost:3001
MASTER_DATA_SERVICE_URL=http://localhost:3002
VOUCHER_SERVICE_URL=http://localhost:3003
CASH_BOOK_SERVICE_URL=http://localhost:3004
PAYABLE_SERVICE_URL=http://localhost:3005
REPORTING_SERVICE_URL=http://localhost:3006
CONFIG_SERVICE_URL=http://localhost:3007
```

### Error Handling
- ServiceClient **swallow errors silently** — trả về `{ success: false, error: {...} }`
- Caller phải check `aggRes.success` trước khi dùng data
- Nếu service unavailable → `SERVICE_UNAVAILABLE` error
- Nếu HTTP 4xx/5xx → `HTTP_ERROR_{code}` error
- Nếu parse fail → `PARSE_ERROR`

### Auth Flow cho Internal Calls
- Reporting service nhận `authToken` từ request header
- Forward token qua `headers['Authorization']` khi gọi voucher/master-data service
- Voucher service decode JWT → extract tenantId → set vào AsyncLocalStorage
- Tenant proxy tự động inject tenantId vào MongoDB queries

## Deployment

### Server Structure
```
kt:/root/chimseo/
├── digital-book-be/
│   ├── dist/apps/{service-name}/main.js  ← deploy target
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

### Deploy Commands
```bash
# Build specific service
cd be && npx nest build {service-name}

# Deploy BE service
scp dist/apps/{service-name}/main.js kt:/root/chimseo/digital-book-be/dist/apps/{service-name}/main.js

# Restart all services
ssh kt "docker restart digital-book-app"

# Deploy FE
cd fe && npm run build
rsync -az fe/dist/ kt:/root/chimseo/nginx/build4/
```

### Docker Container
- Single container `digital-book-app` chạy tất cả 8 services via PM2
- Ports: 3000-3007 (chỉ expose 3000 ra ngoài)
- Env files: db.env, jwt.env, services.env
- Volume mount: `./dist:/app/dist` — chỉ cần scp file mới + restart

## Bugs Đã Fix

### 1. Báo cáo tài chính trả về empty data (2026-05-11)
**Triệu chứng:** Trang /bao-cao/tai-chinh hiển thị tất cả số liệu = 0, trong khi /chung-tu/nhat-ky-chung có data.

**Root cause:** `ServiceClient.loadServiceConfig()` không parse được env var format `VOUCHER_SERVICE_URL=http://localhost:3003`. Fallback về `localhost:3000` (gateway). Gateway nhận request path `/nhat-ky-chung/aggregate-balance` nhưng không match routing → trả 404. Reporting service nhận 404, swallow error → trả empty data.

**Fix:** Cập nhật `loadServiceConfig()` trong `service-client.base.ts` để parse `_URL` format trước, rồi fallback sang `_HOST`/`_PORT`.

**File changed:** `be/libs/service-client/src/service-client.base.ts`
