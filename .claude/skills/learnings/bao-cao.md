# Bao Cao (Reports) — Page Facts

## Page → API Flow

### /bao-cao/tai-chinh (Financial Reports)
Contains 3 tabs, each calls different API:

#### Tab: Bang Can Doi Phat Sinh (Trial Balance)
- **FE API:** `GET /api/reporting/so-cai/trial-balance?startDate=...&endDate=...`
- **Gateway:** strips `/reporting` → forwards to port 3006
- **Controller:** `SoCaiController.getTrialBalance()` at `reporting-service/src/so-cai/so-cai.controller.ts`
- **Service:** `SoCaiService.getTrialBalance()` at `reporting-service/src/so-cai/so-cai.service.ts`
- **Internal calls:**
  - `serviceClient.aggregateBalance()` → Voucher Service (3003) `/nhat-ky-chung/aggregate-balance`
    - Handler: `NhatKyChungController.aggregateBalance()` → `NhatKyChungService.aggregateBalance()`
    - Uses MongoDB $facet pipeline grouping by `danhMuc.taiKhoanNo.ma` and `danhMuc.taiKhoanCo.ma`
  - `serviceClient.getTaiKhoan()` → Master Data Service (3002) `/tai-khoan`
    - Handler: `TaiKhoanController.getAll()` → `TaiKhoanService.findAll()`
- **Verified:** YES (2026-05-11, 2026-05-12 re-verified: 5 entries returned)

#### Tab: Bang Can Doi Ke Toan (Balance Sheet)
- **FE API:** `GET /api/reporting/bao-cao/balance-sheet?asOfDate=...` (NOTE: uses `asOfDate`, NOT startDate/endDate)
- **Gateway:** strips `/reporting` → forwards to port 3006
- **Controller:** `BaoCaoController.getBalanceSheet(@Query('asOfDate') asOfDate)` at `reporting-service/src/bao-cao/bao-cao.controller.ts`
- **Service:** `BaoCaoService.getBalanceSheet(asOfDate, authToken, tenantId)`
- **Internal calls:**
  - `serviceClient.getNhatKyChung('2000-01-01', asOfDate.toISOString())` → Voucher Service (3003)
  - `serviceClient.getTaiKhoan()` → Master Data Service (3002)
- **Logic:** Filters accounts by ma prefix (1xx/2xx = assets, 3xx/4xx = liabilities+equity), calculates balance per account
- **Verified:** FAIL (2026-05-12, HTTP 500)
- **Root cause (suspected):** `new Date(asOfDate)` where asOfDate could be undefined → Invalid Date → `.toISOString()` throws RangeError. Also possible: account.ma is null → `.startsWith()` throws TypeError
- **FE service:** `balanceSheetService.getData(asOfDate)` sends `asOfDate || new Date().toISOString()` — should always have value
- **Files:** `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` (line 131-206), `bao-cao.controller.ts` (line 36-49)

#### Tab: Ket Qua Kinh Doanh (P&L / KQKD)
- **FE API:** `GET /api/reporting/bao-cao/kqkd?startDate=...&endDate=...`
- **Controller:** `BaoCaoController.getKQKD()` at `reporting-service/src/bao-cao/bao-cao.controller.ts`
- **Service:** `BaoCaoService.getKQKD()`
- **Verified:** YES (2026-05-12, returns chiTieu/kyHienTai/kyTruoc)

### /bao-cao/so-cai (General Ledger)
- **FE API:** `GET /api/reporting/so-cai?maTaiKhoan=...&startDate=...&endDate=...`
- **Controller:** `SoCaiController.getLedger()` at `reporting-service/src/so-cai/so-cai.controller.ts`
- **Service:** `SoCaiService.getLedger()`
- **Internal calls:**
  - `serviceClient.getNhatKyChung()` → Voucher Service (3003) `/nhat-ky-chung`
  - `serviceClient.getTaiKhoan()` → Master Data Service (3002) `/tai-khoan`
- **Verified:** NO

### /bao-cao/pnl (P&L Report - separate page)
- **FE API:** `GET /api/reporting/bao-cao/pnl?startDate=...&endDate=...`
- **Controller:** `BaoCaoController.getPnl()`
- **Verified:** NO

## FE Service → BE Endpoint Mapping

| FE Service | Method | BE Endpoint | Params |
|------------|--------|-------------|--------|
| `balanceSheetService` | getData(asOfDate) | GET /bao-cao/balance-sheet | asOfDate |
| `balanceSheetService` | getStats(asOfDate) | GET /bao-cao/balance-sheet | asOfDate |
| `pnlService` | fetchPnL(start,end) | GET /bao-cao/pnl | startDate, endDate |
| `pnlService` | getComparison(start,end,type) | GET /bao-cao/pnl | startDate, endDate, periodType |
| `kqkdService` | getData(params) | GET /bao-cao/kqkd | startDate, endDate, periodType |
| `soCaiService` | getTrialBalance(start,end) | GET /so-cai/trial-balance | startDate, endDate |
| `soCaiService` | getLedger(ma,start,end) | GET /so-cai | maTaiKhoan, startDate, endDate |
| `soCaiService` | getStats(start,end) | GET /so-cai/stats | startDate, endDate |
| `soCaiService` | getSummaryByAccount() | GET /so-cai/summary-by-account | — |

## Known Issues

### [2026-05-12] Balance Sheet returns HTTP 500
- **Endpoint:** GET /api/reporting/bao-cao/balance-sheet?asOfDate=...
- **Suspected root cause:** Either Invalid Date from undefined asOfDate, or null account.ma causing TypeError on .startsWith()
- **Status:** NEEDS FIX

### [2026-05-11] Empty data on financial reports (FIXED)
- See `learnings/system.md` for full details
- Root cause: ServiceClient URL parsing
- Fix applied and verified
