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

## Bug Fixes

### [2026-06-29] NKC mở chi tiết hiển thị sai loại giao dịch (list "bán hàng" → mở ra "mua hàng")
- **Flow:** /chung-tu/nhat-ky-chung → mở phiếu → `loadDataBySoPhieu` (FE) → set `header.loaiGiaoDich`
- **Issue:** Cùng 1 phiếu (vd NKC202606/028, cty giang châu) hiện "bán hàng" ở list nhưng mở ra lại "mua hàng".
- **Root cause:** List (`EntryListTab.tsx:212`) đọc thẳng `record.danhMuc.loaiGiaoDich.ten` (giá trị đã lưu, ĐÚNG). Nhưng màn hình mở (`load-data.handler.ts`) KHÔNG đọc giá trị đã lưu mà SUY LUẬN lại: lấy `nghiepVu` → `quyChaunList.find(qc => qc.nghiepVu === nghiepVu)` → dùng `quyChuan.loaiGiaoDich` đè lên. Khi 1 nghiệp vụ dùng cho cả bán hàng lẫn mua hàng (nhiều QuyChuan cùng nghiepVu khác loaiGiaoDich), `.find()` lấy quy chuẩn ĐẦU TIÊN → sai.
- **Fix:** Đảo thứ tự ưu tiên — tin giá trị đã lưu trên phiếu trước:
  `const loaiGiaoDich = first.danhMuc?.loaiGiaoDich?.ma || quyChuan?.loaiGiaoDich;`
  (trước đó là `quyChuan?.loaiGiaoDich || first.danhMuc?.loaiGiaoDich?.ma`)
- **Verified:** NO (đã build + deploy FE lên masterceo.com.vn lúc 2026-06-29 07:13, chờ user xác nhận trên web — nhớ hard refresh vì có PWA service worker cache)
- **Files:** `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/load-data/load-data.handler.ts` (dòng ~28-31)
### [2026-06-29] BE update() đổi danhMuc không tính lại loai (ĐÃ FIX)
- **Flow:** PATCH chứng từ → `ChungTuService.update()`
- **Issue:** Khi `update` đổi `danhMuc` (loaiGiaoDich), field `loai` (PHIEU_THU/PHIEU_CHI/KHAC) giữ nguyên giá trị cũ → lệch với cấu hình loại giao dịch.
- **Fix:** Sau khi gán `chungTu.danhMuc`, gọi `chungTu.loai = await this.loaiResolver.resolveLoai(updateDto.danhMuc, chungTu.loai)` (giống `create()`, loai cũ làm fallback).
- **Verified:** YES (2026-06-29, deploy voucher-service, container restart, pm2 voucher-service online không lỗi)
- **Files:** `be/apps/voucher-service/src/chung-tu/chung-tu.service.ts` (~dòng 282-290)

## Important Notes

- `danhMuc.taiKhoanNo.ma` and `danhMuc.taiKhoanCo.ma` are the account codes used for aggregation
- Legacy entries may have flat `taiKhoanNo`/`taiKhoanCo` fields (string) instead of nested danhMuc
- Reporting service helper functions handle both formats (see `getTaiKhoanNo()`, `getTaiKhoanCo()`)
