# Service Communication — Inter-Service HTTP Calls

## Architecture Overview

```
Frontend → Gateway (:3000) → strip prefix → forward to target service
                                          ↓
Reporting Service (:3006) → ServiceClient (HTTP) → Voucher Service (:3003)
                          → ServiceClient (HTTP) → Master Data Service (:3002)

Services: auth(3001), master-data(3002), voucher(3003), cash-book(3004),
          payable(3005), reporting(3006), config(3007), kho(3008)
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
KHO_SERVICE_URL=http://localhost:3008
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
- Single container `digital-book-app` chạy tất cả services via PM2
- Ports: 3000-3008 (chỉ expose 3000 ra ngoài)
- Env files: db.env, jwt.env, services.env
- Volume mount: `./dist:/app/dist` — chỉ cần scp file mới + restart

### Kho Service (3008) — Deploy Note
**kho-service là process mới**, chưa có trong bộ deploy hiện tại (PM2 ecosystem chỉ có services 3000-3007). Khi lên production cần:
1. Build: `cd be && npx nest build kho-service`
2. Scp `dist/apps/kho-service/main.js` lên server
3. Thêm entry kho-service vào `pm2/ecosystem.config.js` (port 3008)
4. Thêm `KHO_SERVICE_URL=http://localhost:3008` vào `env/services.env`
5. Thêm `SERVICE_KHO_HOST` / `SERVICE_KHO_PORT` nếu gateway dùng host/port format
6. Restart container: `docker restart digital-book-app`
Phối hợp `/db-deploy` skill khi deploy lần đầu.

## Logging & Request Tracing (requestId)

### Correlation ID end-to-end
- **Header:** `x-request-id`. Gateway sinh UUID nếu client không gửi, hoặc reuse id client gửi.
- **Lưu context:** `RequestContext` (AsyncLocalStorage) tại `libs/core/src/services/request-context/request-context.service.ts` — `getRequestId()`, `getRequest()`. Cũng set `req.id = requestId`.
- **Middleware:** `RequestContextMiddleware` (`libs/core/src/middlewares/`) — chạy ĐẦU TIÊN, đọc/sinh requestId, set response header `x-request-id`, lưu vào ALS.
- **Wire-up toàn hệ thống:** `TenantModule` (@Global, mọi service + gateway import) apply `RequestContextMiddleware` TRƯỚC `TenantMiddleware` trong `configure()`. Không cần chỉnh từng service.
- **Propagate giữa services:** `BaseServiceClient.request()` tự đính header `x-request-id` từ ALS vào mọi call nội bộ → reporting→voucher→master-data dùng chung 1 requestId.
- **Response:** mọi response có header `x-request-id`; body LỖI có thêm field `requestId` (`{success:false, error, requestId}`). Body thành công không đổi.

### Logging (Winston)
- Factory: `createAppLogger(serviceName)` tại `libs/core/src/logger/winston.logger.ts`. Truyền vào `NestFactory.create(Module, { logger })` ở từng `main.ts` → thay Nest Logger mặc định (mọi `new Logger()` cũ + LoggingInterceptor + GlobalExceptionFilter đều đi qua Winston, tự kèm `[requestId]`).
- `LoggingInterceptor` + `GlobalExceptionFilter` được bật global ở 8 service backend (gateway chỉ bật filter — interceptor không hợp với stream proxy).
- **Transports:** console (1 dòng, màu) + file JSON daily-rotate:
  - `{service}-%DATE%.log` (mọi level) và `{service}-error-%DATE%.log` (chỉ error)
  - rotate theo ngày, nén gzip, maxSize 20MB, giữ 14 ngày.
- **Env:** `LOG_DIR` (mặc định `logs`), `LOG_LEVEL` (mặc định `info`).

### ⚠️ Deploy note — BẮT BUỘC mount volume cho log
Container chạy PM2 đa-service; log ghi trong container sẽ MẤT khi restart/redeploy. Khi deploy cần:
1. Thêm vào `env/services.env`: `LOG_DIR=/app/logs` (và `LOG_LEVEL` nếu cần).
2. Thêm volume trong `docker-compose.yml`: `./logs:/app/logs` (tạo thư mục `logs/` trên host).
3. `logs/` đã được `.gitignore`.

## Bugs Đã Fix

### 1. Báo cáo tài chính trả về empty data (2026-05-11)
**Triệu chứng:** Trang /bao-cao/tai-chinh hiển thị tất cả số liệu = 0, trong khi /chung-tu/nhat-ky-chung có data.

**Root cause:** `ServiceClient.loadServiceConfig()` không parse được env var format `VOUCHER_SERVICE_URL=http://localhost:3003`. Fallback về `localhost:3000` (gateway). Gateway nhận request path `/nhat-ky-chung/aggregate-balance` nhưng không match routing → trả 404. Reporting service nhận 404, swallow error → trả empty data.

**Fix:** Cập nhật `loadServiceConfig()` trong `service-client.base.ts` để parse `_URL` format trước, rồi fallback sang `_HOST`/`_PORT`.

**File changed:** `be/libs/service-client/src/service-client.base.ts`
