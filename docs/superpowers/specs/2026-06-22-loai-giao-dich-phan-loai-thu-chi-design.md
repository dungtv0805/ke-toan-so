# Phân loại Thu/Chi tự động qua Loại giao dịch → Loại chứng từ

- Ngày: 2026-06-22
- Trạng thái: Đã duyệt thiết kế, triển khai v1

## Bối cảnh & vấn đề

`chung_tu` là collection dùng chung cho **Phiếu thu, Phiếu chi và Nhật ký chung**. Trường
`loai` (hiện chỉ `PHIEU_THU` | `PHIEU_CHI`) quyết định phiếu hiện ở phân hệ nào:

- Phiếu thu = lọc `loai = PHIEU_THU`
- Phiếu chi = lọc `loai = PHIEU_CHI`
- Nhật ký chung = xem **tất cả** bản ghi (không lọc `loai`)

`loai` hiện được set **theo điểm nhập** (trang Phiếu thu hardcode `PHIEU_THU`, nhật ký chung
lấy từ FE) chứ không theo bản chất nghiệp vụ. Hệ quả: toàn bộ 581 bản ghi (cả 13 tenant) đều
`PHIEU_THU` → Phiếu chi trống, mọi nghiệp vụ chi/mua hàng lọt vào Phiếu thu.

Dữ liệu đầu vào đã có sẵn `danhMuc.loaiGiaoDich` (vd: Tăng tiền mặt, Giảm tiền gửi ngân hàng,
Mua hàng, Bán hàng). Đây là tín hiệu đủ để suy ra thu/chi.

## Mục tiêu

Thu/chi do **cấu hình nghiệp vụ** quyết định, không do màn hình nhập:

`danhMuc.loaiGiaoDich.ma → loai_giao_dich.loaiChungTuMa → loai_chung_tu.phanLoai → chung_tu.loai`

Phân loại thành **3 nhóm**: `THU` → Phiếu thu, `CHI` → Phiếu chi, `KHAC` → chỉ Nhật ký chung
(mua/bán chịu, không qua quỹ).

## Mô hình dữ liệu

### `loai_chung_tu` (LoaiChungTuMaster) — thêm cờ phân loại
- `phanLoai: 'THU' | 'CHI' | 'KHAC'` (mặc định `KHAC`).
- Backfill 48 bản ghi sẵn có: `THU_*` → THU, `CHI_*` → CHI, còn lại → KHAC (người dùng rà lại).

### `loai_giao_dich` (LoaiGiaoDich) — thêm liên kết
- `loaiChungTuMa?: string` — mã trỏ tới một Loại chứng từ (nullable).

### `chung_tu` (ChungTu) — thêm giá trị thứ 3 cho `loai`
- `loai: 'PHIEU_THU' | 'PHIEU_CHI' | 'KHAC'`.
- Bản ghi `KHAC` không lọt vào Phiếu thu/Phiếu chi; vẫn hiện ở Nhật ký chung (không đổi).

## Logic suy luận (Backend — Hướng 1, BE tự suy)

Helper thuần trong voucher-service:

```
resolveLoai(danhMuc, fallbackLoai) -> 'PHIEU_THU' | 'PHIEU_CHI' | 'KHAC'
  lgdMa = danhMuc?.loaiGiaoDich?.ma
  nếu không có lgdMa  -> trả fallbackLoai (giữ tương thích)
  lct = config.loaiGiaoDich[lgdMa]?.loaiChungTuMa
  phanLoai = config.loaiChungTu[lct]?.phanLoai
  nếu không tra được   -> trả fallbackLoai + log cảnh báo
  map: THU->PHIEU_THU, CHI->PHIEU_CHI, KHAC->KHAC
```

- `fallbackLoai` = `loai` mà caller (controller/endpoint/FE) gửi. Nhập tay không kèm Loại giao
  dịch → hành xử như cũ.
- Cấu hình lấy từ master-data qua `ServiceClient`, **cache theo tenant** (TTL ngắn).
- Áp dụng tại: `ChungTuService.create`, `ChungTuService.importPhieu`,
  `NhatKyChungService.create`, `createBatch`, `importEntries`, batch-update.

### ServiceClient
- Thêm 2 method: lấy danh sách `loai-giao-dich` và `loai-chung-tu` (dùng endpoint `/all` sẵn có
  ở master-data). Map thành lookup `{ma -> record}`.

### Số phiếu (v1)
- `VoucherNumberService` xử lý prefix cho `KHAC` (vd `NK`). **v1: giữ nguyên số phiếu cũ khi
  phân loại lại** — không đánh số lại (tránh trùng/đụng dải số). Đánh số lại để bản sau (v1+).

## Cấu hình (Frontend)
- Trang **Loại chứng từ** (`/danh-muc/loai-chung-tu`): thêm cột + ô chọn "Phân loại"
  (Thu / Chi / Nhật ký chung). Cập nhật service + schema (zod) + form.
- Trang **Loại giao dịch** (`/danh-muc/loai-giao-dich`): thêm ô chọn "Loại chứng từ", hiển thị
  Phân loại suy ra. Cập nhật service + form.

## Script phân loại lại dữ liệu cũ
- Script BE chạy theo `tenantId`, dùng đúng `resolveLoai`.
- Chế độ `dry-run` in báo cáo đối chiếu trước khi `apply`.
- Oracle kiểm chứng MASTER CEO (`69a1018b0bf5104993e0c3c5`): **11 THU / 24 CHI / 27 KHAC** = 62.
  - Tăng tiền mặt(1)+Tăng tiền gửi NH(10)=11 → PHIEU_THU
  - Giảm tiền mặt(1)+Giảm tiền gửi NH(23)=24 → PHIEU_CHI
  - Mua hàng(17)+Bán hàng(10)=27 → KHAC
- Làm MASTER CEO trước; mở rộng tenant khác sau khi tenant đó đã cấu hình Loại giao dịch.

## Kiểm thử
- Unit `resolveLoai`: 3 nhánh THU/CHI/KHAC + fallback (thiếu loaiGiaoDich, thiếu cấu hình).
- Unit `VoucherNumberService`: prefix cho `KHAC`.
- Test logic migration (thuần) khớp 11/24/27 trên dữ liệu mẫu MASTER CEO.

## Ngoài phạm vi (v1)
- Đánh lại số phiếu theo loại (PT/PC/NK) cho dữ liệu cũ.
- Tự động phân loại tenant khác (chạy thủ công sau khi cấu hình).
