# Digital Books — System-Wide Facts

## Service Communication

### [2026-05-11] ServiceClient URL parsing fix
- **Flow:** Reporting Service → ServiceClient → Voucher Service (port 3003)
- **Issue:** Financial reports returned empty data (all zeros)
- **Root cause:** `ServiceClient.loadServiceConfig()` couldn't parse `VOUCHER_SERVICE_URL=http://localhost:3003` env format. Fell back to `localhost:3000` (gateway). Gateway returned 404 for internal paths.
- **Fix:** Updated `loadServiceConfig()` in `be/libs/service-client/src/service-client.base.ts` to parse `_URL` format first
- **Verified:** YES (2026-05-11, trial balance returns 5 entries, balance sheet shows assets 289,232,869d)
- **Files:** `be/libs/service-client/src/service-client.base.ts`

### ServiceClient Error Handling Pattern
- ServiceClient **swallows errors silently** — returns `{ success: false, error: {...} }`
- Caller MUST check `res.success` before using data
- If service unavailable → `SERVICE_UNAVAILABLE` error
- If HTTP 4xx/5xx → `HTTP_ERROR_{code}` error
- Empty data appears as valid response (not thrown error)

### [2026-05-12] Env Validation Guard
- **Issue:** Thay đổi env nhiều lần gây lỗi vặt do ServiceClient silently fallback về localhost:3000
- **Fix:** Added `console.warn` in `loadServiceConfig()` khi không tìm thấy env config cho service
- **Behavior:** Log warning rõ ràng liệt kê tất cả env vars đã check, giúp debug nhanh khi thêm service mới hoặc thay đổi env
- **Files:** `be/libs/service-client/src/service-client.base.ts`
- **Verified:** NO (cần deploy và test)

## Auth & Tenant

### JWT + Tenant Flow
- Login returns `tempToken` + tenant list (if user has multiple tenants)
- After tenant selection → full `accessToken` with tenantId embedded
- Internal service calls forward `Authorization` header
- Voucher service decodes JWT → extracts tenantId → AsyncLocalStorage
- TenantProxy auto-injects tenantId into all MongoDB queries

### Permission System
- RoleGuard checks user's role against `@Roles()` decorator
- Roles: ADMIN, KE_TOAN_TRUONG, KE_TOAN_TONG_HOP, KE_TOAN_QUY, KE_TOAN_CONG_NO, MANAGER, KIEM_SOAT
- Config service manages permissions per role per tenant

## Tenant Isolation (Auto-inject tenantId)

### [2026-05-12] TenantId tự động inject — KHÔNG cần query/add/update thủ công (VERIFIED)

#### Flow: Request → AsyncLocalStorage → Repository Proxy

1. **TenantMiddleware** (`libs/core/src/tenant/tenant.middleware.ts`)
   - Intercept mọi request, decode JWT (không verify — chỉ decode)
   - Extract `{ tenantId, userId, email }` → `TenantContextService.run(context, next)`
   - Dùng `AsyncLocalStorage` để lưu context xuyên suốt request lifecycle

2. **TenantContextService** (`libs/core/src/tenant/tenant-context.service.ts`)
   - Singleton service, dùng `AsyncLocalStorage<TenantContext>`
   - `getCurrentTenantId()` — lấy tenantId từ current request context
   - `isSuperAdmin()` — check email === SUPER_ADMIN_EMAIL

3. **createTenantAwareProxy** (`libs/database/src/database.module.ts`)
   - Proxy wrap tất cả Repository methods:
     - **Filter methods** (find, findOne, findBy, count, exist, findAndCount): auto-inject `{ tenantId }` vào WHERE
     - **Inject methods** (save, insert, create): auto-set `tenantId` trên entity
     - **Criteria methods** (update, delete, softDelete, restore): auto-inject `tenantId` vào criteria
     - **Aggregate**: auto-inject `{ $match: { tenantId } }` vào đầu pipeline
   - Nếu không có tenant context (unauthenticated) → không filter (pass-through)

4. **TenantSubscriber** (`libs/database/src/tenant.subscriber.ts`)
   - TypeORM EventSubscriber — backup layer
   - `beforeInsert` / `beforeUpdate`: auto-set `tenantId` nếu entity chưa có
   - Exempt entities: User, UserCredential, UserTenant, Tenant

#### Kết quả
- **Developer KHÔNG cần** thêm `tenantId` vào query hay entity khi code service
- Mọi `repository.find()`, `repository.save()` đều tự động scoped theo tenant
- **Bypass:** Dùng `DatabaseModule.forFeatureRaw(entities)` + `InjectRawRepository` cho SuperAdmin services

#### LƯU Ý QUAN TRỌNG: Module phải dùng đúng import
- **ĐÚNG:** `DatabaseModule.forFeature([Entity])` — repository được wrap bởi TenantAwareProxy → auto-inject tenantId
- **SAI:** `TypeOrmModule.forFeature([Entity])` — repository KHÔNG có proxy → query không filter theo tenant → data leak cross-tenant
- `DatabaseModule.forFeature()` nội bộ gọi `TypeOrmModule.forFeature()` rồi override repository provider bằng proxy
- Nếu dùng nhầm `TypeOrmModule.forFeature()` trực tiếp → mất tenant isolation hoàn toàn

#### Files
- `be/libs/core/src/tenant/tenant.middleware.ts`
- `be/libs/core/src/tenant/tenant-context.service.ts`
- `be/libs/database/src/database.module.ts` (createTenantAwareProxy, forFeature, forFeatureRaw)
- `be/libs/database/src/tenant.subscriber.ts`

## Data Patterns

### Voucher Entry Structure (ChungTu)
```
{
  soPhieu: "PT001/2026",
  loai: "PHIEU_THU" | "PHIEU_CHI",
  ngay: Date,
  soTien: number,
  noiDung: string,
  danhMuc: {
    taiKhoanNo: { ma: "112", ten: "Tien gui ngan hang", loai, nhom },
    taiKhoanCo: { ma: "131", ten: "Phai thu cua khach hang", loai, nhom },
    loaiGiaoDich: { ma, ten },
    nghiepVu: { ma, ten },
    doiTuong2: { id, ma, ten, loai }
  }
}
```

### Account Types (loai field in TaiKhoan)
- `TAI_SAN` — Assets (debit-normal: NO)
- `NO_PHAI_TRA` — Liabilities (credit-normal: CO)
- `VON_CHU_SO_HUU` — Equity (credit-normal: CO)
- `DOANH_THU` — Revenue (credit-normal: CO)
- `CHI_PHI` — Expenses (debit-normal: NO)

### Account Groups (nhom field)
- `NO` — Debit balance accounts
- `CO` — Credit balance accounts
- `LUONG_TINH` — Dual-nature accounts
- `KHONG_CO_SO_DU` — No-balance accounts (revenue/expense)

## Reporting Service Flows

### Trial Balance (Bang Can Doi Phat Sinh)
- **FE page:** `/bao-cao/tai-chinh` tab "Bang can doi phat sinh"
- **FE API:** `GET /api/reporting/so-cai/trial-balance?startDate=...&endDate=...`
- **BE flow:** `SoCaiController.getTrialBalance()` → `SoCaiService.getTrialBalance()`
  - Calls `serviceClient.aggregateBalance()` → Voucher Service `/nhat-ky-chung/aggregate-balance`
  - Calls `serviceClient.getTaiKhoan()` → Master Data Service `/tai-khoan`
  - Merges aggregation data with account info
  - Calculates duNo/duCo based on account type (loai)

### Balance Sheet (Bang Can Doi Ke Toan)
- **FE page:** `/bao-cao/tai-chinh` tab "Bang can doi ke toan"
- **FE API:** `GET /api/reporting/bao-cao/balance-sheet?startDate=...&endDate=...`
- **BE flow:** `BaoCaoController.getBalanceSheet()` → `BaoCaoService.getBalanceSheet()`

### P&L Report (Bao Cao Ket Qua Kinh Doanh)
- **FE page:** `/bao-cao/tai-chinh` tab "Ket qua kinh doanh"
- **FE API:** `GET /api/reporting/bao-cao/kqkd?startDate=...&endDate=...`
- **BE flow:** `BaoCaoController.getKQKD()` → `BaoCaoService.getKQKD()`

### General Ledger (So Cai)
- **FE page:** `/bao-cao/so-cai`
- **FE API:** `GET /api/reporting/so-cai?maTaiKhoan=...&startDate=...&endDate=...`
- **BE flow:** `SoCaiController.getLedger()` → `SoCaiService.getLedger()`
  - Calls `serviceClient.getNhatKyChung()` → Voucher Service `/nhat-ky-chung`
  - Calls `serviceClient.getTaiKhoan()` → Master Data Service `/tai-khoan`
