# Làm lại trang Tổng quan — 5 tab báo cáo

Ngày: 2026-08-10
Nguồn nghiệp vụ: bảng đặc tả khách gửi (cột *Tên Giao diện · Vị trí · Nội dung báo cáo · Hình thức*)

## Bối cảnh

Trang `/` (`fe/src/pages/dashboard/Dashboard.tsx`) hiện có 4 tab: **Tài chính**
(dữ liệu thật) và **Nhân sự / Bán hàng / Điều hành** (UI mẫu tĩnh, số liệu
hardcode trong `MockTabDashboard.tsx`).

Đặc tả mới yêu cầu 5 tab theo trục nghiệp vụ: **Tổng quan · Dòng tiền · Kết quả
kinh doanh · Công nợ · Bán hàng**.

Ba component đã viết sẵn nhưng **chưa được render ở đâu**: `AgingCharts.tsx`,
`TopPartnersCharts.tsx`, `OverdueTables.tsx`. Tab Công nợ chỉ cần nối dây.

## Phạm vi — đã chốt

| Quyết định | Chốt |
|---|---|
| Số tab | Đúng 5 tab. Bỏ hẳn tab Nhân sự và Điều hành |
| Kế hoạch – Dự báo – Thực hiện | **Bỏ khỏi đợt này.** Hệ thống chưa có chỗ nhập kế hoạch/ngân sách; tách thành dự án riêng sau |
| Chiều "Khu vực/điểm", "Nguồn khách hàng" | **Bỏ.** Chưa có danh mục lẫn trường trên chứng từ. Chỉ làm các chiều đã có dữ liệu |
| Quan hệ với menu Kế toán → Báo cáo | Giữ cả hai, tách vai trò: 5 tab = dashboard trực quan; `/bao-cao/*` = bảng chi tiết, lọc sâu, xuất Excel |
| Tab Tổng quan | Giữ nguyên biểu đồ hiện có, **thêm hàng KPI** lên đầu |
| EBITDA, Cảnh báo tài chính, Lịch thu/trả nợ, Đối chiếu công nợ | Làm cả 4 |

## 1. Cấu trúc trang

```
fe/src/pages/dashboard/
├── Dashboard.tsx          # chỉ còn: thanh lọc kỳ + chuyển tab + render tab đang chọn
├── tabs/
│   ├── TongQuanTab.tsx
│   ├── DongTienTab.tsx
│   ├── KqkdTab.tsx
│   ├── CongNoTab.tsx
│   └── BanHangTab.tsx
└── components/            # chart dùng chung (giữ nguyên) + KpiRow/KpiCard mới
```

`Dashboard.tsx` hiện dài ~160 dòng và chứa cả layout của tab Tài chính. Sau khi
tách, nó chỉ giữ thanh lọc và bảng điều hướng tab — mỗi tab tự lo layout của mình.

Mỗi tab nhận cùng một bộ props từ thanh lọc kỳ dùng chung:

```ts
interface TabProps { year: number; startMonth: number; endMonth: number }
```

Thanh lọc kỳ giữ nguyên `PERIOD_OPTIONS` / `resolvePeriod` từ
`@/components/shared/period`, vẫn ghim trên cùng khi cuộn.

Nút bánh răng cấu hình khối (chỉ admin) vẫn chỉ hiện ở tab **Tổng quan**, đúng
như hiện tại.

**Xoá:** `components/MockTabDashboard.tsx` và `components/ExecutionStatusCharts.tsx`.
Gỡ key `tinhHinhThucHien` khỏi `DASHBOARD_BLOCKS` trong `DashboardSettingsModal.tsx`.

> Lưu ý dữ liệu cũ: `tenant.dashboardConfig` của các công ty đang lưu mảng key có
> thể chứa `tinhHinhThucHien`. FE lọc bỏ key lạ khi đọc — không cần migration.

### Thành phần dùng chung: KpiRow

Mỗi tab mở đầu bằng một hàng thẻ KPI. Tái sử dụng kiểu dáng thẻ của
`MockTabDashboard` (class `stat-card`, icon nền mờ, nhãn viết hoa nhỏ) nhưng dữ
liệu thật.

```ts
interface KpiItem {
  key: string;
  label: string;
  value: number;          // đã là số; KpiCard tự định dạng
  format?: 'tien' | 'phanTram' | 'soLuong';
  inverse?: boolean;      // true = tăng là xấu (tô đỏ)
  icon: React.ReactNode;
  onClick?: () => void;   // dùng cho thẻ Cảnh báo
}
```

`KpiRow` nhận `KpiItem[]` + `loading`, render `Row/Col` responsive
(`xs={12} lg={6}`). Không tự gọi API — tab truyền dữ liệu vào.

Không hiển thị "% so kỳ trước" ở đợt này: dữ liệu kỳ trước chỉ có sẵn cho doanh
số (tab Bán hàng). Thẻ KPI chỉ hiện con số.

## 2. Tab Tổng quan

**Hàng KPI (8 thẻ):**

| Thẻ | Nguồn |
|---|---|
| Tổng tiền | Số dư cuối kỳ TK 111 + 112 |
| Doanh thu | Phát sinh Có TK 511 trong kỳ |
| Lợi nhuận | Lợi nhuận sau thuế (từ `kqkd`) |
| Dòng tiền thuần | Tổng thu − tổng chi trong kỳ |
| Phải thu | Số dư Nợ các TK có `chiTietTheo` là đối tượng |
| Phải trả | Số dư Có tương ứng |
| Giá trị tồn kho | Số dư cuối kỳ TK 15x |
| Cảnh báo | Số lượng cảnh báo (mục 7) — bấm mở modal chi tiết |

**Bên dưới:** giữ nguyên các khối hiện có — `RevenueTrendChart`,
`CashFlowChart`, `RevenueExpenseBreakdownCharts`, `CongNoChart`,
`BalanceStructureChart`, `NghiaVuChinhSachTable` — cùng cơ chế bật/tắt theo
`dashboardConfig` như hiện nay.

## 3. Tab Dòng tiền

**KPI (5):** Số dư đầu kỳ · Tổng thu · Tổng chi · Dòng tiền thuần · Số dư cuối kỳ.

**Khối:**

1. `CashFlowChart` — đã có, giữ nguyên.
2. **Bảng số dư theo tài khoản/quỹ** *(mới)* — mỗi dòng một TK tiền:
   `Tài khoản | Số dư đầu kỳ | Phát sinh Nợ | Phát sinh Có | Số dư cuối kỳ`,
   có dòng tổng. Phạm vi TK: 111* và 112*, chi tiết tới từng quỹ/tài khoản ngân
   hàng theo `chiTietTheo = NGAN_HANG_QUY`.
3. **Tỷ trọng thu / chi theo nhóm dòng tiền** — dùng
   `dashboardService.getCashCompositionByRange`, hai donut cạnh nhau.
4. **Khoản thu/chi sắp đến hạn** *(mới)* — bảng gộp 4 mốc: trong 7 / 30 / 60 / 90
   ngày tới, mỗi mốc hai cột Thu và Chi. Nguồn: hạn thanh toán của công nợ.

## 4. Tab Kết quả kinh doanh

**KPI (8):** Doanh thu · Giá vốn · Lợi nhuận gộp · Chi phí · EBITDA · LNTT ·
LNST · Tỷ suất lợi nhuận ròng (LNST / Doanh thu).

**EBITDA** = Lợi nhuận trước thuế + chi phí lãi vay (phát sinh Nợ TK 635) +
khấu hao (phát sinh Có TK 214).

> Công ty chưa dùng TK 214 thì EBITDA = LNTT + lãi vay. Đây là hành vi chấp nhận
> được, không phải lỗi — thẻ KPI có tooltip ghi rõ công thức.

**Khối:**

1. **Xu hướng từng chỉ tiêu** — biểu đồ đường theo tháng, có nút chọn chỉ tiêu
   (Doanh thu / Giá vốn / LN gộp / Chi phí / LNST). Nguồn: `pnl-series`.
2. **Tỷ trọng doanh thu & chi phí theo kỳ** — `RevenueExpenseBreakdownCharts`, đã có.
3. **Lợi nhuận theo chiều** — dropdown chọn: Đối tượng / Dự án / Đội / Sản phẩm /
   Bộ phận / Nhân viên / Hợp đồng. Nguồn: `loi-nhuan-theo` (mở rộng, mục 7).

## 5. Tab Công nợ

**KPI (4):** Tổng phải thu · Tổng phải trả · Đến hạn (trong 30 ngày) · Quá hạn.

**Khối:**

1. `AgingCharts` — tuổi nợ 5 nhóm cho AR và AP. **Đã viết sẵn, chỉ cần nối.**
2. `TopPartnersCharts` — TOP 5 khách hàng nợ / TOP 5 NCC phải trả. **Đã viết sẵn.**
3. `OverdueTables` — bảng công nợ quá hạn AR/AP. **Đã viết sẵn.**
4. **Lịch thu nợ / trả nợ** *(mới)* — hai bảng cạnh nhau (Thu | Trả), gom theo mốc
   7 / 30 / 60 / 90 ngày tới: `Mốc | Số khoản | Số tiền`. Dùng chung endpoint với
   khối "sắp đến hạn" của tab Dòng tiền.
5. **Đối chiếu công nợ** *(mới)* — bảng theo từng đối tượng:
   `Đối tượng | Số dư đầu kỳ | Phát sinh tăng | Phát sinh giảm | Số dư cuối kỳ`,
   lọc theo loại (phải thu / phải trả), xuất Excel để gửi khách làm biên bản đối
   chiếu.

   **Giới hạn phạm vi:** đây là *báo cáo* đối chiếu. Không làm luồng gửi — ký —
   xác nhận — lưu trạng thái biên bản.

## 6. Tab Bán hàng

**KPI (4):** Doanh số kỳ này · So cùng kỳ (%) · Số hợp đồng phát sinh · Doanh số
bình quân/hợp đồng.

**Khối:**

1. **Doanh số theo thời gian** — cột doanh số kỳ này + đường doanh số cùng kỳ năm
   trước. Nút chuyển `Ngày | Tháng | Quý | Năm`.
2. **Doanh số theo chiều** — cột ngang, dropdown chọn: Nhân viên kinh doanh / Đội /
   Bộ phận / Sản phẩm / Khách hàng / Hợp đồng.

## 7. Cảnh báo tài chính

Ba loại, đếm gộp thành một con số trên thẻ KPI của tab Tổng quan:

| Loại | Điều kiện |
|---|---|
| Công nợ quá hạn | Có ít nhất một khoản AR hoặc AP quá hạn — đếm theo số khoản |
| Số dư tiền âm | Số dư cuối kỳ TK 111 hoặc 112 < 0 — đếm theo số tài khoản |
| Lợi nhuận âm | LNST của kỳ đang lọc < 0 — đếm là 1 |

Bấm vào thẻ mở modal liệt kê từng cảnh báo, mỗi dòng có link sang trang chi tiết
tương ứng. Khi tổng = 0, thẻ hiện màu xanh "Không có cảnh báo".

Hàm đếm tách riêng thành `dashboard/canhBao.ts` + `canhBao.test.ts`.

## 8. Backend — reporting-service

### Tái sử dụng endpoint đã có — không viết mới

`GET /reporting/so-cai/trial-balance?startDate&endDate` đã trả về, cho **từng tài
khoản**: `noDauKy · coDauKy · noPhatSinh · coPhatSinh · noCuoiKy · coCuoiKy`, kèm
`doiTuongChiTiet[]` cùng cấu trúc cho từng đối tượng. FE đã có
`soCaiService.getTrialBalance(startDate, endDate)`.

Từ một lần gọi đó dẫn xuất được:

| Cần | Cách lấy |
|---|---|
| Bảng số dư theo TK/quỹ (tab Dòng tiền) | Lọc `ma` bắt đầu `111`/`112`, quỹ/ngân hàng nằm trong `doiTuongChiTiet` |
| Đối chiếu công nợ (tab Công nợ) | Lọc TK 131/136/138 (thu) hoặc 331/336/338 (trả), đọc `doiTuongChiTiet` |
| KPI Tổng tiền | Σ `noCuoiKy − coCuoiKy` của TK `111`/`112` |
| KPI Giá trị tồn kho | Σ `noCuoiKy − coCuoiKy` của TK `15*` |

Lịch thu/trả nợ tính ở FE: `/payable/phai-thu` và `/payable/phai-tra` gọi
`findAll()` **không phân trang**, trả toàn bộ bản ghi kèm `hanThanhToan` và
`conLai`.

KPI Phải thu / Phải trả **không** lấy từ trial-balance mà dùng
`congNoPhaiThuService.getStats().conLai` / `congNoPhaiTraService.getStats().conLai`
— cùng nguồn với tab Công nợ, để hai tab không bao giờ lệch số.

### Endpoint thật sự phải làm

| Endpoint | Trả về |
|---|---|
| `GET /bao-cao/doanh-so-theo?startDate&endDate&groupBy&dimension` | `groupBy` ∈ `ngay\|thang\|quy\|nam`; doanh số kỳ này + cùng kỳ năm trước, và doanh số theo chiều |
| Mở rộng `GET /bao-cao/loi-nhuan-theo` | `fieldMap` thêm `bo-phan`, `nhan-vien`, `hop-dong` |
| Mở rộng `GET /bao-cao/kqkd` | Trả thêm trường `ebitda` ở cấp cao nhất |

Tất cả dùng `@Roles` giống các endpoint `bao-cao` hiện có và nhận `tenantId` từ
`@CurrentUser()`.

`doanh-so-theo` gom trên `nhatKyChung`, lấy phát sinh Có TK 511 và nhóm theo
`danhMuc[<chiều>]` — cùng cách `getLoiNhuanByDimension` đang làm. Chiều `hop-dong`
lấy `danhMuc.hopDong.soHopDong` chứ không phải `.ma` (snapshot hợp đồng không có
trường `ma`).

EBITDA thêm thành **trường riêng** `ebitda: { kyHienTai, kyTruoc }` của
`KqkdReport`, **không** thêm dòng vào mảng `chiTieu` — mảng đó là mẫu B02-DN đang
render nguyên văn ở `/bao-cao/kqkd`, chèn dòng lạ vào sẽ làm sai báo cáo chính thức.

## 9. Điều hướng sang báo cáo chi tiết

Mỗi khối có link "Xem chi tiết" ở góc phải tiêu đề:

| Khối | Đích |
|---|---|
| Dòng tiền | `/so-quy` |
| KQKD | `/bao-cao/kqkd` |
| Tỷ trọng DT/CP | `/bao-cao/pnl` |
| Công nợ | `/bao-cao/bang-tong-hop` |
| Bán hàng | `/bao-cao/doanh-thu` |
| Cân đối | `/bao-cao/tai-chinh` |

## 10. Kiểm thử

Các hàm tính thuần tách khỏi component, mỗi hàm một file `*.test.ts` đặt cạnh —
theo đúng pattern của `bangCanDoiFilter.test.ts`, `kqkdExport.test.ts`:

| File | Kiểm |
|---|---|
| `canhBao.test.ts` | Đếm đúng 3 loại; trả 0 khi sạch; không đếm trùng |
| `ebitda.test.ts` | Có/không có TK 214; LNTT âm; số 0 |
| `lichThanhToan.test.ts` | Phân đúng mốc 7/30/60/90; khoản đã quá hạn không lọt vào lịch tương lai; biên đúng ngày thứ 7 và 30 |
| `soSanhCungKy.test.ts` | Cùng kỳ = 0 → trả `null` thay vì chia cho 0; kỳ vắt qua năm |

Chạy `npm run lint` và `npm run build` ở `fe/`, `yarn test` ở `be/` trước khi coi
là xong.

## Ngoài phạm vi

- Module nhập kế hoạch / ngân sách / dự báo — và mọi biểu đồ so sánh Kế hoạch–Thực hiện
- Danh mục Khu vực/Điểm và Nguồn khách hàng, cùng trường tương ứng trên chứng từ
- Luồng ký/xác nhận biên bản đối chiếu công nợ
- Gộp các trang `/bao-cao/*` vào trong tab
- Tab Nhân sự và Điều hành (xoá, không thay thế)
