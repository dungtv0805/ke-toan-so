# Bảng tổng hợp công nợ — Thiết kế

**Ngày:** 2026-06-15
**Trạng thái:** Đã duyệt (approach + quy ước kế toán)
**Page:** `/bao-cao/bang-tong-hop` (đang ComingSoon → thay bằng page thật)

## 1. Mục tiêu

Báo cáo tổng hợp công nợ theo đối tượng: với mỗi tài khoản công nợ, liệt kê
các đối tượng và số dư đầu kỳ / phát sinh / cuối kỳ ở hai bên **Phải thu** và
**Phải trả**, có dòng tổng theo tài khoản và tổng toàn báo cáo.

Layout theo mẫu Excel "BẢNG TỔNG HỢP CÔNG NỢ":

| Mã ĐT | Tên ĐT | Đầu kỳ: Phải thu \| Phải trả | Phát sinh: Phải thu \| Phải trả | Cuối kỳ: Phải thu \| Phải trả |
|-------|--------|-----------------------------|---------------------------------|-------------------------------|

## 2. Quy ước kế toán (đã chốt)

1. **Phải thu = bên Nợ (dư Nợ); Phải trả = bên Có (dư Có)** của TK công nợ.
   Áp dụng cho cả đầu kỳ, phát sinh, cuối kỳ.
2. **Không bù trừ giữa các đối tượng**: dòng tổng của 1 TK = **tổng các đối
   tượng**. Một TK (vd 1311) có thể vừa có Phải thu (đối tượng A nợ mình) vừa
   có Phải trả (mình nợ đối tượng B). Không net cả TK về 1 số.
3. **TK công nợ** = TK có `chiTietTheo` ∈ {`KHACH_HANG`, `NHA_CUNG_CAP`,
   `NHA_THAU`, `NHAN_VIEN`} (loại trừ `NGAN_HANG_QUY`). Mặc định gồm tất cả;
   có ô lọc chọn 1 TK.

## 3. Kỳ báo cáo

- Chọn **Từ ngày – Đến ngày**.
- Đầu kỳ = số dư trước "Từ ngày"; Phát sinh = trong khoảng; Cuối kỳ = lũy kế
  đến "Đến ngày". (Khớp đúng mô hình `prior/period` của dữ liệu sẵn có.)
- Mặc định FE: tháng hiện tại (ngày 1 → cuối tháng).

## 4. Kiến trúc — tái dụng tối đa

Nguồn dữ liệu & phép tính đã có sẵn và đã test trong `SoCaiService`
(reporting-service):

- `serviceClient.aggregateBalanceByDoiTuong(start, end)` → mỗi (TK, đối tượng):
  `priorNo, priorCo, periodNo, periodCo`.
- `serviceClient.getSoDuDauKyRaw()` → số dư đầu kỳ theo (TK, đối tượng).
- `serviceClient.getTaiKhoan()` → danh mục TK (có `loai`, `chiTietTheo`, `ten`).
- Helper thuần đã export: `computeTrialRow`, `buildDoiTuongRows`,
  `DOI_TUONG_CHI_TIET_TYPES` — tính ra `noDauKy/coDauKy/noPhatSinh/coPhatSinh/
  noCuoiKy/coCuoiKy` cho từng đối tượng, đã net Nợ/Có theo `loai` TK.

→ Báo cáo công nợ **không viết lại phép tính**: chỉ lọc TK công nợ, gọi
`buildDoiTuongRows`, map Nợ→Phải thu / Có→Phải trả, và cộng subtotal theo đối
tượng.

### Backend (reporting-service)

Module mới `cong-no-tong-hop/`:

- `cong-no-tong-hop.controller.ts` — `@Controller('bao-cao')`,
  `@Get('bang-tong-hop-cong-no')`, query: `startDate`, `endDate`,
  `maTaiKhoan?`, `maDoiTuong?`. Truyền `authToken` xuống service.
- `cong-no-tong-hop.service.ts`:
  1. Gọi song song 3 serviceClient ở trên (giống phần đối tượng của
     `getTrialBalance`).
  2. Gom đối tượng-agg và opening theo mã TK (tái dùng cách gom trong
     `getTrialBalance`).
  3. Lọc TK: `chiTietTheo` ∈ `CONG_NO_CHI_TIET_TYPES` (= 4 loại ở §2.3); nếu có
     `maTaiKhoan` thì chỉ giữ TK đó.
  4. Mỗi TK: `buildDoiTuongRows(loai, aggs, openings, chiTietTheo)` → các dòng
     đối tượng (mỗi dòng đủ 6 trường Nợ/Có). Nếu có `maDoiTuong` → lọc còn dòng
     đó (giữ cả dòng "Chưa xác định đối tượng" khi maDoiTuong rỗng → không lọc).
  5. Map mỗi dòng → `{ ma, ten, dauKy:{phaiThu:noDauKy, phaiTra:coDauKy},
     phatSinh:{phaiThu:noPhatSinh, phaiTra:coPhatSinh},
     cuoiKy:{phaiThu:noCuoiKy, phaiTra:coCuoiKy} }`.
  6. `subtotal` của TK = Σ các dòng đối tượng (cả 6 trường). `totals` = Σ các TK.
  7. Bỏ TK không có dòng đối tượng nào (toàn 0).
- `cong-no-tong-hop.helper.ts` — hàm thuần `mapRow`, `sumRows`, `buildReport`
  (nhận entries đã build + danh mục TK + filter) để **unit test** không cần
  HTTP. Controller/service chỉ lo orchestration I/O.
- Đăng ký module trong `reporting-service.module.ts`.

**Response shape:**
```ts
interface CongNoCell { phaiThu: number; phaiTra: number }
interface CongNoRowVal { dauKy: CongNoCell; phatSinh: CongNoCell; cuoiKy: CongNoCell }
interface CongNoDoiTuongRow extends CongNoRowVal { ma: string; ten: string }
interface CongNoAccount extends CongNoRowVal {           // subtotal nằm ngay ở account
  ma: string; ten: string; doiTuongs: CongNoDoiTuongRow[];
}
interface BangTongHopCongNo {
  accounts: CongNoAccount[];
  totals: CongNoRowVal;
}
// BE bọc { success: true, data: BangTongHopCongNo } (đúng convention parseResponse FE)
```

### Frontend (page `bao-cao/bang-tong-hop`)

Theo **convention các page báo cáo** (`BangCanDoiPage`, `SoChiTietTaiKhoanPage`):
plain React + service, **không** dùng CHanlder.

- File: `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx` (+ tách
  component con nếu cần: bảng, toolbar).
- Route: `App.tsx` — đổi `bang-tong-hop` từ `<ComingSoonPage/>` sang page mới
  (lazy import như các page báo cáo khác). Sidebar đã trỏ sẵn.
- Service: thêm `getBangTongHopCongNo({ startDate, endDate, maTaiKhoan?,
  maDoiTuong? })` vào service báo cáo, gọi `GET /bao-cao/bang-tong-hop-cong-no`.
- Bộ lọc: `RangePicker` (mặc định tháng hiện tại), `Select` TK công nợ (lấy từ
  `taiKhoanService`, lọc `chiTietTheo` ∈ 4 loại), `Select` đối tượng (từ
  `doiTuongService`). Nút "Xem báo cáo".
- Bảng (AntD Table, nhóm theo TK):
  - Header cột 2 tầng: nhóm "Số dư đầu kỳ / Số phát sinh / Số dư cuối kỳ", mỗi
    nhóm 2 cột con Phải thu | Phải trả; cộng 2 cột Mã ĐT, Tên ĐT.
  - Dòng tiêu đề TK = mã+tên + subtotal (6 cột), tô nền giống mẫu.
  - Dòng đối tượng thụt vào.
  - Dòng **Tổng cộng** trên cùng (totals).
  - Số 0 hiển thị "0"/"-" theo style hiện có; định dạng tiền `vi-VN`.
- **Drill-down**: click dòng đối tượng → `navigate('/bao-cao/so-chi-tiet-tai-khoan?
  maTaiKhoan=<accMa>&maDoiTuong=<dtMa>&startDate=<ISO>&endDate=<ISO>')`
  (page đích đã đọc đúng các param này qua `parseReportParams`). Dòng "Chưa xác
  định đối tượng" (ma rỗng) không drill-down.

## 5. Data flow

```
FE BangTongHopCongNoPage
  └─ GET /bao-cao/bang-tong-hop-cong-no?startDate&endDate&maTaiKhoan?&maDoiTuong?
       (gateway → reporting:3006)
        └─ CongNoTongHopService
             ├─ aggregateBalanceByDoiTuong (→ voucher)
             ├─ getSoDuDauKyRaw            (→ master-data)
             └─ getTaiKhoan               (→ master-data)
             → lọc TK công nợ → buildDoiTuongRows → map PT/PTr → subtotal/totals
  → render bảng nhóm + drill-down sang Sổ chi tiết tài khoản
```

## 6. Error handling

- ServiceClient lỗi (`res.success === false`) → coi như mảng rỗng (giống
  `getTrialBalance`), báo cáo trả `accounts: [], totals: 0`. FE hiện "Không có
  dữ liệu".
- `startDate`/`endDate` thiếu/không hợp lệ → BE trả `BadRequestException`
  (giống các endpoint báo cáo khác). FE luôn gửi range hợp lệ.
- Quyền: theo guard/role hiện hành của nhóm `/bao-cao`.

## 7. Testing

- **BE unit test** (`cong-no-tong-hop.helper.spec.ts`) trên hàm thuần:
  - Map Nợ→Phải thu, Có→Phải trả đúng cho TK loại NO (131) và CO (331).
  - **Không bù trừ**: TK có đối tượng A dư Nợ + đối tượng B dư Có → subtotal có
    cả phaiThu và phaiTra > 0.
  - `totals` = Σ accounts; `subtotal` = Σ doiTuongs.
  - Lọc `maTaiKhoan`, `maDoiTuong` đúng.
  - Loại TK không phải công nợ (NGAN_HANG_QUY / không có chiTietTheo) bị bỏ.
  - Dòng toàn 0 bị loại; dòng "Chưa xác định đối tượng" giữ đúng.
- **FE**: kiểm thử thủ công sau deploy (render bảng, filter, drill-down).

## 8. Ngoài phạm vi (YAGNI)

- Xuất Excel (không yêu cầu lần này).
- Phân trang (báo cáo gộp, dữ liệu vừa phải — render full như các báo cáo khác).
- Chọn kỳ theo tháng/quý (chỉ Từ–Đến ngày).
