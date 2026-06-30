# Thiết kế: Import Nhật ký chung — gộp nhiều dòng vào 1 chứng từ + cột Ngày ghi sổ

**Ngày:** 2026-06-30
**Trạng thái:** Đã duyệt thiết kế, chờ viết plan
**Phạm vi:** Chỉ màn **Import Nhật ký chung** (`/chung-tu/nhat-ky-chung` → Import Excel)

## 1. Bối cảnh & vấn đề

Một "chứng từ" trong hệ thống = **nhiều bản ghi `ChungTu` đơn dòng cùng chung `soPhieu`** (số phiếu
là khoá gom). Tạo tay (form NKC → `createBatch`) sinh **1 số phiếu** cho mọi dòng nên gộp đúng.
Nhưng **import** hiện sinh **mỗi dòng một số phiếu riêng** (`importEntries` gọi
`generateVoucherNumbers(N)` — N số phân biệt), nên mỗi dòng Excel thành một chứng từ độc lập.
Template import **không có cột nào để báo các dòng thuộc cùng một chứng từ** (một hoá đơn nhiều dòng).

Phụ: trường **Ngày ghi sổ** (`ngayGhiSo`) đã có trong entity + form tay + export Excel, nhưng
**template import chưa có cột này**. BE `importEntries` đã đọc sẵn `item.ngayGhiSo` (mặc định =
ngày phát sinh nếu trống) — chỉ thiếu đường dẫn từ FE.

## 2. Mục tiêu

1. Import gom được nhiều dòng Excel vào **một chứng từ** (chung 1 số phiếu hệ thống tự sinh).
2. Bổ sung cột **Ngày ghi sổ** vào template import (optional, trống = ngày phát sinh).
3. Không phá vỡ hành vi cũ: dòng không khai nhóm vẫn là "1 dòng = 1 chứng từ".

## 3. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi | Chỉ Import **Nhật ký chung** (không đụng Phiếu thu/chi) |
| Cách gom | Thêm **cột "Nhóm chứng từ"** (optional). Cùng giá trị → 1 chứng từ; trống → 1 dòng/chứng từ |
| Số phiếu | **Hệ thống tự sinh 1 số/nhóm** (cột nhóm chỉ là nhãn gom, không lưu, giá trị gì cũng được) |
| Header chứng từ gộp | Lấy theo **dòng đầu của nhóm** (Ngày phát sinh, Ngày ghi sổ, Người giao dịch, Địa chỉ, Ghi chú); phần hạch toán giữ riêng từng dòng |
| Ngày ghi sổ | Thêm **cột "Ngày ghi sổ"** (optional); trống → BE mặc định = ngày phát sinh (đã có sẵn) |

## 4. Hành vi chi tiết

### 4.1 Gộp dòng
- Thêm cột **"Nhóm chứng từ"** vào template (không bắt buộc).
- Khi import, các dòng có cùng giá trị nhóm (khác rỗng) và **cùng `loai`** → một chứng từ:
  hệ thống sinh **một `soPhieu`** đóng dấu lên tất cả bản ghi của nhóm.
- Mỗi bản ghi vẫn là một `ChungTu` đơn dòng (TK Nợ/Có, Số tiền, Diễn giải, mã danh mục riêng).
- **Header** (Ngày phát sinh `ngay`, Ngày ghi sổ `ngayGhiSo`, Người giao dịch, Địa chỉ, Ghi chú)
  của cả nhóm lấy theo **dòng đầu tiên** của nhóm (theo thứ tự xuất hiện trong file).
- Dòng có nhóm **rỗng** → mỗi dòng là một nhóm riêng → giữ nguyên hành vi hiện tại
  (1 dòng = 1 số phiếu).
- `loai` của nhóm: lấy theo dòng đầu (một chứng từ = một loại). Các dòng cùng nhóm được coi
  như cùng loại của dòng đầu.

### 4.2 Ngày ghi sổ
- Thêm cột **"Ngày ghi sổ"** (optional) vào template + bước parse → gắn `ngayGhiSo` lên mỗi
  `CreateEntryDto`.
- BE đã có: `importEntries` set `ngayGhiSo: new Date(item.ngayGhiSo || item.ngay)`
  (`nhat-ky-chung.service.ts:593`). Trống → tự lấy ngày phát sinh. **Không sửa BE phần này.**

## 5. Thay đổi kỹ thuật

### Frontend (`fe/src/pages/chung-tu/nhat-ky-chung/import/`)
- `lib/columns.ts`: thêm 2 cột — **"Nhóm chứng từ"** (`nhomGop`, optional) và
  **"Ngày ghi sổ"** (`ngayGhiSo`, optional). Cập nhật union key + mảng cột.
- `lib/template.ts`: thêm 2 cột vào file mẫu tải về (header + dòng ví dụ minh hoạ gộp).
- `lib/validate.ts`: `nhomGop`/`ngayGhiSo` optional; `ngayGhiSo` nếu có phải parse được ngày.
- Parse handler: map 2 cột mới vào `item` (`nhomGop`, `ngayGhiSo`).
- Submit handler / service: gửi nguyên mảng `items` (đã có sẵn) — chỉ cần `item` mang thêm field.

### Backend
- `be/libs/dto/src/voucher/nhat-ky-chung.dto.ts` (+ `create-nhat-ky-chung.dto.ts`): thêm
  `nhomGop?: string` (optional, `@IsOptional() @IsString()`). `ngayGhiSo?` đã có.
- `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` → `importEntries`:
  thay logic cấp số phiếu. Hiện gom index theo `loai` rồi `generateVoucherNumbers(N)` (N riêng/dòng).
  Mới: gom index theo **khoá `(loai, nhomGop)`**; với mỗi nhóm **có `nhomGop`** sinh **1 số** dùng
  chung; với dòng **không** `nhomGop` giữ nguyên 1-số-mỗi-dòng. Header của nhóm gộp lấy từ dòng đầu.

## 6. Biên & lỗi

- `nhomGop` rỗng/thiếu → standalone (tương thích ngược, là mặc định).
- Nhóm có `loai` lẫn lộn (lý thuyết) → dùng `loai` của dòng đầu cho cả nhóm.
- `ngayGhiSo` sai định dạng → validate báo lỗi dòng đó (như các cột ngày khác).
- Số phiếu vẫn dùng `voucherNumberService` hiện hành (đồng bộ đánh số, tránh trùng).

## 7. Test

- **Unit `importEntries`:**
  - 3 dòng: 2 dòng `nhomGop="A"` + 1 dòng `nhomGop=""` → tạo **2 số phiếu**; 2 bản ghi nhóm A
    chung 1 `soPhieu`; dòng rỗng có `soPhieu` riêng.
  - Header (ngay/ngayGhiSo/nguoiGiaoDich…) của 2 bản ghi nhóm A lấy theo dòng đầu nhóm.
  - `ngayGhiSo` trống → `= ngay`; có giá trị → giữ giá trị.
  - Hai nhóm khác `nhomGop` cùng `loai` → 2 số phiếu khác nhau.
- **FE:** parse một file mẫu có cột Nhóm + Ngày ghi sổ → `items` mang đúng `nhomGop`/`ngayGhiSo`;
  build pass.

## 8. Ngoài phạm vi (YAGNI)

- Cảnh báo/khoá khi tổng Nợ ≠ tổng Có trong một nhóm.
- Gộp dòng cho Import Phiếu thu/chi (cơ chế tương tự, làm sau nếu cần).
- Đổi nhãn cột "Ngày chứng từ" → "Ngày phát sinh" (giữ nguyên nhãn hiện tại).
