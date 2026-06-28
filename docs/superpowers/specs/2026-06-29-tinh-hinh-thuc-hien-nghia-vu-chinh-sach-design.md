# TÌNH HÌNH THỰC HIỆN NGHĨA VỤ CHÍNH SÁCH (bản rút gọn Báo cáo nhanh thuế TNDN)

Ngày: 2026-06-29

## Mục tiêu

Thêm một khối báo cáo **"TÌNH HÌNH THỰC HIỆN NGHĨA VỤ CHÍNH SÁCH"** lên dashboard
**Tổng quan** (tab Tài chính), dựng theo sheet "Tổng quan" (rows 51-73) của
`docs/templates/THIẾT KẾ_KẾ TOÁN.xlsx`. Đây là bản RÚT GỌN của Báo cáo nhanh thuế TNDN,
gồm 4 nhóm nghĩa vụ: **THUẾ TNDN, THUẾ GTGT, THUẾ TNCN, BHXH** — mỗi chỉ tiêu trình bày
theo Quý 1-4 + Lũy kế.

## Bảng theo sheet (cột: TT | CHỈ TIÊU | Quý 1 | Quý 2 | Quý 3 | Quý 4 | Lũy kế)

**THUẾ TNDN** (11 dòng)
1. Doanh thu thuần
2. Giá vốn
3. Chi phí bán hàng
4. Chi phí quản lý
5. Chi phí khác
6. Tổng CP phát sinh
7. Lợi nhuận trước thuế
8. Chi phí không được trừ
9. Thu nhập tính thuế
10. Thuế TNDN phải nộp
11. Lợi nhuận sau thuế

**THUẾ GTGT** (4 dòng): VAT còn kỳ trước; VAT bán ra; VAT mua vào; VAT còn phải nộp
**THUẾ TNCN** (1 dòng): Thuế TNCN phải nộp
**BHXH** (1 dòng): Bảo hiểm phải nộp

## Quyết định kiến trúc

Tái dùng tối đa logic thuế đã có. Thêm **1 endpoint BE** trả về sẵn ma trận rút gọn
(server tính, FE chỉ render) — tránh FE gọi 5 lần `tong-hop` (mỗi lần recompute TNDN, rất nặng).

### Nguồn dữ liệu (đã có sẵn trong tax-service)
- `BaoCaoService.baoCaoTNDN(nam)` → `{ quy: TNDNQuyData[4], luyKe }` đủ toàn bộ dòng TNDN.
- VAT theo quý: load `BangKeMuaVao`/`BangKeBanRa` 1 lần, lọc theo `quyToRange(q,nam)`,
  `tongVatTheoKy()` → vatDauVao/vatDauRa; vatPhaiNop=max(0,raVao); vatConKhauTru=max(0,vaoRa).
- `DieuChinhThueService.getOrDefault(nam)` → `thueTNCN[]`, `bhxh3383[]`, `bhyt3384[]`, `bhtn3386[]`.

## Hợp đồng API (CỐ ĐỊNH — cả BE và FE bám theo)

`GET /tax/nghia-vu-chinh-sach?nam=YYYY` (guards như các endpoint tax khác), trả:
```ts
interface NvcsRow { tt: string; chiTieu: string; q1: number; q2: number; q3: number; q4: number; luyKe: number; }
interface NvcsSection { ma: 'TNDN' | 'GTGT' | 'TNCN' | 'BHXH'; tieuDe: string; rows: NvcsRow[]; }
interface NghiaVuChinhSach { nam: number; sections: NvcsSection[]; }
// Controller bọc { success: true, data: NghiaVuChinhSach } như các endpoint khác.
```

### Ánh xạ dòng (BE tính)
TNDN — selector trên `tndn.quy[i]`, lũy kế trên `tndn.luyKe`:
| TT | Chỉ tiêu | Công thức |
|----|----------|-----------|
| 1 | Doanh thu thuần | dt511 + dt515 + dt711 |
| 2 | Giá vốn | cp632 |
| 3 | Chi phí bán hàng | cp641 |
| 4 | Chi phí quản lý | cp642 |
| 5 | Chi phí khác | cp811 |
| 6 | Tổng CP phát sinh | tongChiPhi |
| 7 | Lợi nhuận trước thuế | lnTruocThue |
| 8 | Chi phí không được trừ | chiPhiKhongTru |
| 9 | Thu nhập tính thuế | thuNhapTinhThue |
| 10 | Thuế TNDN phải nộp | thueTNDN |
| 11 | Lợi nhuận sau thuế | lnSauThue |

GTGT — VAT tính theo từng quý:
| 1 | VAT còn kỳ trước | vatConKhauTru của quý TRƯỚC (Q1 = 0); luyKe = 0 |
| 2 | VAT bán ra | vatDauRa[q]; luyKe = tổng |
| 3 | VAT mua vào | vatDauVao[q]; luyKe = tổng |
| 4 | VAT còn phải nộp | vatPhaiNop[q]; luyKe = tổng |

TNCN: Thuế TNCN phải nộp = `thueTNCN[i]`; luyKe = tổng.
BHXH: Bảo hiểm phải nộp = `bhxh3383[i] + bhyt3384[i] + bhtn3386[i]`; luyKe = tổng.

> Ghi chú: "Doanh thu thuần" cộng cả 511+515+711 để giữ nhất quán số học row1 − row6 = row7.
> "Chi phí không được trừ" = `chiPhiKhongTru` (auto từ chứng từ + điều chỉnh tay, BE đã gộp).

## BE — tax-service

- `bao-cao.service.ts`: thêm `async nghiaVuChinhSach(nam, authToken): Promise<NghiaVuChinhSach>`.
  - Tách phần dựng dòng thành helper thuần để test được: `buildNvcsSections(tndn, vatPerQuy, dieuChinh)`
    (đặt cạnh `tax-calc.ts` hoặc file `nghia-vu-chinh-sach.util.ts`). VAT per quý là input thuần
    `{ vatDauVao,vatDauRa,vatPhaiNop,vatConKhauTru }[4]`.
- `bao-cao.controller.ts`: thêm `@Get('nghia-vu-chinh-sach') @Roles(...KE_TOAN_ROLES)` →
  `{ success:true, data }`.
- Test: unit test cho `buildNvcsSections` (theo mẫu test `tax-calc`), kiểm tra ánh xạ + lũy kế +
  VAT còn kỳ trước (Q1=0, Q2=vatConKhauTru Q1).

## FE — dashboard

- `src/services/taxService.ts`: thêm interface `NvcsRow/NvcsSection/NghiaVuChinhSach` +
  `taxReportService.getNghiaVuChinhSach(nam)` → `GET /nghia-vu-chinh-sach?nam`.
- Component mới `src/pages/dashboard/components/NghiaVuChinhSachTable.tsx`:
  - Props `{ year: number }`. `useQuery(['nvcs', year], () => getNghiaVuChinhSach(year))`.
  - Card tiêu đề "TÌNH HÌNH THỰC HIỆN NGHĨA VỤ CHÍNH SÁCH".
  - antd Table: cột `TT | CHỈ TIÊU | Quý 1 | Quý 2 | Quý 3 | Quý 4 | Lũy kế`. Cột số align right,
    format `Intl.NumberFormat('vi-VN')`, giá trị 0 hiển thị trống. Dòng tiêu đề nhóm
    (THUẾ TNDN/…) là 1 row span full, đậm, nền nhạt. `pagination={false}`, `size="small"`, bordered.
  - Loading/empty state gọn.
- `Dashboard.tsx` (tab tai-chinh): render `{show('nghiaVuChinhSach') && <NghiaVuChinhSachTable year={year} />}`
  đặt sau khối Công nợ/Cân đối.
- `DashboardSettingsModal.tsx`: thêm block `{ key:'nghiaVuChinhSach', label:'Nghĩa vụ chính sách' }`
  vào `DASHBOARD_BLOCKS` + 1 `PREVIEWS.nghiaVuChinhSach` đơn giản (vd bảng mini/icon).
  (config null → hiện tất cả nên mặc định khối mới sẽ hiện.)

## Phạm vi KHÔNG làm
- Không thêm cột "Công thức"/"Tài khoản" như bản đầy đủ (đây là bản rút gọn).
- Không thêm phần cảnh báo tự động (rows 40-47 của sheet TNDN) trong đợt này.
- Không sửa trang Báo cáo nhanh thuế TNDN hiện có.

## Kiểm thử / hoàn tất
- BE: `npx nest build tax-service` sạch + unit test helper pass.
- FE: `npm run build` + `npm run lint` sạch.
- Deploy: tax-service (main.js) + FE (nginx) theo skill db-deploy. Smoke: mở Tổng quan → tab
  Tài chính → khối mới hiển thị, đổi kỳ (năm) → số đổi theo năm.
