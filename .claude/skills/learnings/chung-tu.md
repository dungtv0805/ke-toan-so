# Chung Tu (Vouchers/Journal) — Page Facts

## Page → API Flow

### /chung-tu/nhat-ky-chung (Journal Entries)
- **FE API:** `GET /api/voucher/nhat-ky-chung?page=1&limit=15&startDate=...&endDate=...`
- **Gateway:** strips `/voucher` → forwards to port 3003
- **Controller:** `NhatKyChungController.getEntries()` at `voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`
- **Service:** `NhatKyChungService.getEntries()` at `voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`
- **DB:** MongoDB aggregation pipeline with $match, $sort, $skip, $limit
- **Verified:** YES (2026-05-11, confirmed data returns for tenant ONENESS WORLD)

### Create Journal Entry
- **FE API:** `POST /api/voucher/nhat-ky-chung`
- **Controller:** `NhatKyChungController.create()`
- **Service:** `NhatKyChungService.create()` → generates soPhieu via `VoucherNumberService`
- **Verified:** NO

### Batch Create (multiple entries, same soPhieu)
- **FE API:** `POST /api/voucher/nhat-ky-chung/batch`
- **Controller:** `NhatKyChungController.createBatch()`
- **Service:** `NhatKyChungService.createBatch()`
- **Verified:** NO

### Batch Update
- **FE API:** `PATCH /api/voucher/nhat-ky-chung/batch`
- **Body:** `{ soPhieu: string, items: BatchItemDto[] }`
- **Logic:** Items with id → UPDATE, without id → CREATE, in DB but not in request → DELETE
- **Verified:** NO

### Stats
- **FE API:** `GET /api/voucher/nhat-ky-chung/stats?startDate=...&endDate=...`
- **Service:** `NhatKyChungService.getStats()` — MongoDB $group aggregation
- **Verified:** NO

### Summary
- **FE API:** `GET /api/voucher/nhat-ky-chung/summary/:type`
- **Types:** account, team, employee, project, investor, product, currency
- **Service:** `NhatKyChungService.getSummary()` → `buildSummaryAggregation()`
- **Verified:** NO

## Data Structure

```
ChungTu {
  _id: ObjectId
  tenantId: string (auto-injected by TenantProxy)
  soPhieu: "PT001/2026" | "PC001/2026"
  loai: "PHIEU_THU" | "PHIEU_CHI"
  ngay: Date
  soTien: number
  noiDung: string
  nguoiGiaoDich: string
  diaChi: string
  ghiChu: string
  nguoiTaoId: string
  danhMuc: {
    taiKhoanNo: { ma, ten, loai, nhom }
    taiKhoanCo: { ma, ten, loai, nhom }
    loaiGiaoDich: { ma, ten }
    nghiepVu: { ma, ten }
    doiTuong: { id?, ma?, ten?, loai? }
    doiTuong2: { id?, ma?, ten?, loai? }
  }
  createdAt: Date
  updatedAt: Date
}
```

## Important Notes

- `danhMuc.taiKhoanNo.ma` and `danhMuc.taiKhoanCo.ma` are the account codes used for aggregation
- Legacy entries may have flat `taiKhoanNo`/`taiKhoanCo` fields (string) instead of nested danhMuc
- Reporting service helper functions handle both formats (see `getTaiKhoanNo()`, `getTaiKhoanCo()`)
