# Xuất Excel cho tất cả báo cáo — Thiết kế

Ngày: 2026-07-07

## Mục tiêu

Tất cả các trang báo cáo (mục "Báo cáo" trên sidebar) có nút **Xuất Excel** hoạt động,
xuất ra file `.xlsx` **giống cấu trúc bảng đang hiển thị trên hệ thống**: đúng cột & thứ tự,
giữ header gộp nhiều tầng, giữ phân cấp/thụt lề, in đậm dòng tổng/nhóm, định dạng số.

Mức độ đã chốt: **giống cấu trúc** (không tái hiện màu nền/viền/màu chữ y hệt web).
Phạm vi dữ liệu: **xuất đúng bộ dữ liệu bảng đang giữ ở client**, không gọi lại API.

**Báo cáo nhiều tab** (Sổ cái 3 tab, Bảng cân đối 2 tab, Báo cáo tài chính 4 tab): 1 nút
"Xuất Excel" xuất **đúng bảng của tab đang mở** (`activeTab`) → 1 file, 1 sheet. Nếu tab đang mở
chỉ có biểu đồ (không có bảng) ⇒ `message.warning("Tab này không có bảng để xuất")`, không tạo file.
Một tab có nhiều bảng (vd Cân đối kế toán = Tài sản + Nguồn vốn) ⇒ nhiều khối nối tiếp trong 1 sheet.

## Kiến trúc

### Helper dùng chung: `fe/src/utils/exportReportExcel.ts`

Dùng `exceljs` (đã có trong `fe/package.json`). `xlsx` hiện tại (`exportExcel.ts`) quá đơn giản
(chỉ title + 1 hàng header + rows phẳng), không làm được header gộp + in đậm ⇒ **không dùng cho báo cáo**.
Giữ nguyên `exportExcel.ts` cho Nhật ký chung (đang chạy tốt), không đụng tới.

Helper nhận một "mô hình bảng" thuần dữ liệu và tự lo toàn bộ định dạng + tải file.

```ts
export interface ReportCol {
  key: string;                 // khóa map vào ReportRow.cells
  header: string;              // nhãn cột (leaf) hoặc nhãn nhóm (nếu có children)
  children?: ReportCol[];      // có children ⇒ header gộp 2 tầng (merge)
  width?: number;              // độ rộng cột (mặc định 15)
  align?: "left" | "right" | "center";
  numFmt?: string;             // định dạng số exceljs, vd "#,##0;(#,##0)"; bỏ trống ⇒ text
}

export interface ReportRow {
  cells?: Record<string, string | number | null | undefined>;
  bold?: boolean;              // in đậm cả dòng (dòng tổng/nhóm/danh mục)
  indent?: number;            // thụt lề cột nhãn đầu tiên (số cấp)
  fill?: "total" | "group" | "category"; // tô nền nhẹ (xám/vàng nhạt/xanh nhạt)
  section?: string;            // nếu set: dòng tiêu đề khối, merge ngang toàn bảng, in đậm; bỏ qua cells
  spacer?: boolean;            // nếu true: dòng trống ngăn cách khối
}

export interface ReportSheet {
  name: string;                // tên sheet (<=31 ký tự, tự cắt/sanitize)
  title: string;               // dòng tiêu đề lớn (merge ngang toàn bảng)
  meta?: string[];             // các dòng dưới tiêu đề: kỳ báo cáo, bộ lọc...
  columns: ReportCol[];        // các khối trong 1 sheet dùng CHUNG bộ cột này
  rows: ReportRow[];           // xen kẽ dòng dữ liệu + section/spacer để mô tả nhiều khối
}
```

Các sheet nhiều khối (#4 "Cân đối kế toán", #7) dùng **chung một bộ `columns`**: header cột render
**một lần** ở đầu sheet; mỗi khối mở đầu bằng một `ReportRow{section, spacer}` (tiêu đề khối in đậm)
rồi tới các dòng dữ liệu của khối. Không lặp lại header cột giữa sheet.

```ts
export async function exportReportExcel(
  fileName: string,            // KHÔNG kèm .xlsx
  sheets: ReportSheet[],
): Promise<void>;
```

Helper xử lý:
- Dòng tiêu đề (title) merge ngang toàn bộ số cột lá, in đậm, cỡ lớn.
- Các dòng `meta` (kỳ, bộ lọc), mỗi dòng 1 row.
- **Header 2 tầng**: cột có `children` ⇒ merge ô nhóm ngang theo số con + tầng dưới là các cột lá;
  cột không có `children` ⇒ merge dọc 2 hàng. Header in đậm, canh giữa, tô nền xám nhạt, có viền.
- Độ rộng cột theo `width`.
- Với mỗi `ReportRow`: ghi giá trị theo `columns` (đệ quy lấy cột lá theo `key`).
  - Ô có `numFmt` ⇒ set `cell.numFmt`, canh phải; giá trị số truyền dạng **number** (không phải chuỗi đã format).
  - `indent` áp vào cột lá **đầu tiên** (`alignment.indent`).
  - `bold` ⇒ font đậm cả dòng; `fill` ⇒ tô nền nhẹ.
- Viền mỏng cho vùng dữ liệu.
- Freeze pane dưới header.
- Tải: `workbook.xlsx.writeBuffer()` → `new Blob([...], {type: xlsx})` → tạo `<a download>` bấm rồi revoke.
  Không thêm thư viện `file-saver`.

### Adapter mỗi báo cáo

Mỗi trang báo cáo có **1 hàm adapter nhỏ** (đặt trong chính file page, hoặc file `*.export.ts` cạnh page)
biến state bảng hiện có → `ReportSheet[]`, rồi gọi `exportReportExcel`. Nút "Xuất Excel" gắn `onClick`
với trạng thái loading + `message.warning` khi không có dữ liệu / `message.success` khi xong / `message.error` khi lỗi.

Adapter **không gọi lại API** — dùng đúng dữ liệu client đang render.

## Phạm vi — 8 báo cáo

| # | Trang | File | Nút | Cấu trúc | Xuất |
|---|-------|------|-----|----------|------|
| 1 | Sổ cái | `so-cai/SoCaiPage.tsx` | có (no-op) | 3 tab (bảng) | 1 sheet theo tab |
| 2 | Bảng cân đối | `bang-can-doi/BangCanDoiPage.tsx` | có (no-op) | 2 tab (1 bảng + 1 chart) | 1 sheet theo tab |
| 3 | PnL (Lãi/lỗ) | `pnl/PnLPage.tsx` | có (no-op) | phân cấp danh mục | 1 sheet |
| 4 | Báo cáo tài chính | `tai-chinh/BaoCaoTaiChinhPage.tsx` | có (no-op) | 4 tab | 1 sheet theo tab |
| 5 | Bảng tổng hợp công nợ | `bang-tong-hop/BangTongHopCongNoPage.tsx` | thêm mới | header gộp + dòng TK/tổng | 1 sheet |
| 6 | Báo cáo hợp đồng | `hop-dong/BaoCaoHopDongPage.tsx` | thêm mới | phẳng | 1 sheet |
| 7 | Sổ chi tiết tài khoản | `so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx` | thêm mới | nhiều khối theo TK | **1 sheet nhiều khối** |
| 8 | KQKD | `kqkd/KqkdPage.tsx` | thêm mới | phân cấp | 1 sheet |

### Chi tiết #1 Sổ cái (theo `activeTab`)

- Tab `1` "Tổng hợp theo TK" — `summaryData` (`SoCaiByAccount[]`) + dòng Tổng cộng in đậm cuối.
- Tab `2` "Chi tiết tài khoản" — `selectedAccount.chiTiet` (`SoCaiEntry[]`); tiêu đề khối = mã+tên TK,
  các số dư đầu/phát sinh/cuối đưa vào `meta`. Nếu chưa chọn TK ⇒ warning.
- Tab `3` "Bảng cân đối phát sinh" — `trialBalance` (`TrialBalance[]`, header gộp) + dòng Tổng cộng.

### Chi tiết #2 Bảng cân đối (theo `activeTab`)

- Tab `1` "Bảng cân đối kế toán" — 1 sheet 2 khối: "TÀI SẢN" (`data.taiSan`) + dòng "TỔNG CỘNG TÀI SẢN",
  "NGUỒN VỐN" (`data.nguonVon`) + dòng "TỔNG CỘNG NGUỒN VỐN". Cột: Chỉ tiêu / Mã số / Số đầu năm / Số cuối kỳ / Chênh lệch.
- Tab `2` "Cơ cấu tài sản & vốn" (chart) ⇒ warning không có bảng để xuất.

### Chi tiết #4 Báo cáo tài chính (theo `activeTab`)

Trang là Tabs 4 tab, xuất **tab đang mở** thành 1 sheet, dùng đúng dữ liệu client đang giữ:
1. Tab `1` **Cân đối tài khoản** — cây `trialBalanceTree` (full tree) + dòng Tổng cộng in đậm cuối.
2. Tab `2` **Cân đối kế toán** — 1 sheet 2 khối nối tiếp: "TÀI SẢN" (`taiSanTree`) và "NGUỒN VỐN" (`nguonVonTree`).
3. Tab `3` **Kết quả kinh doanh** — `kqkdData.chiTieu` (dùng chung adapter KQKD ở #8).
4. Tab `4` **So sánh lãi lỗ** — `buildPnLComparisonData()`.

### Chi tiết #7 Sổ chi tiết tài khoản (1 sheet nhiều khối)

Khi chọn nhiều TK: mỗi TK là **một khối** trong **cùng một sheet**, nối tiếp nhau, cách nhau bằng
1 dòng trống + dòng tiêu đề khối (mã + tên TK). Mỗi khối có header cột + dòng số dư đầu kỳ, phát sinh, số dư cuối.

## Xử lý chi tiết chung

- **Phân cấp / cây**: các bảng cây đã dựng **toàn bộ cây** ở client (expand/collapse chỉ ẩn/hiện).
  ⇒ xuất **đầy đủ cây**, giữ thứ tự & phân cấp bằng `indent`, không phụ thuộc node đang mở/đóng.
- **Dòng tổng (`summary`)**: render riêng trên web ⇒ thành dòng `bold` (+ `fill:"total"`) cuối bảng.
- **Số âm / màu đỏ**: web tô đỏ số âm; Excel dùng `numFmt = "#,##0;(#,##0)"` (âm trong ngoặc),
  ô rỗng/0 hiển thị `-` qua `"#,##0;(#,##0);\"-\""`. Không tô màu chữ.
- **Phần trăm** (KQKD): `numFmt` dạng `0.0"%"` với số âm trong ngoặc.
- **Tên file**: `<Tên báo cáo>_<từ ngày>-<đến ngày>.xlsx` (ngày `DDMMYYYY`). Nếu báo cáo không theo
  khoảng ngày thì bỏ hậu tố ngày.
- **Không có dữ liệu**: `message.warning("Không có dữ liệu để xuất")`, không tạo file.

## Kiểm thử

Không có hạ tầng test cho FE report pages. Verify bằng:
- `cd fe && npm run build` và `npm run lint` (không lỗi mới).
- Mở thủ công từng báo cáo, bấm Xuất Excel, đối chiếu file với bảng (đúng cột, header gộp,
  dòng tổng in đậm, số đúng định dạng, đủ dữ liệu cây).

## Ngoài phạm vi (YAGNI)

- Không tái hiện màu nền/viền/màu chữ y hệt web.
- Không thêm tùy chọn "chỉ xuất dòng đang mở" cho bảng cây.
- Không đụng `exportExcel.ts` (xlsx) của Nhật ký chung.
- Không thêm export PDF.
