# Sổ chi tiết tài khoản — chọn kỳ như Báo cáo tài chính

Thay ô "từ ngày – đến ngày" (`RangePicker`) trên trang Sổ chi tiết tài khoản bằng bộ chọn kỳ dùng chung `PeriodFilter` — đúng bộ chọn mà Báo cáo tài chính đang dùng.

## Giao diện

`SoChiTietTaiKhoanPage`: bỏ `RangePicker`, đặt `<PeriodFilter autoApply defaultPeriod={...} defaultCustomRange={...} onFilter={...} />` ở đầu FilterBar.

- Dropdown kỳ: Tháng 1…12 (của năm nay) / 6 tháng đầu năm / 6 tháng cuối năm / Năm nay / Năm trước / Tùy chọn. Chọn "Tùy chọn" hiện 2 ô Từ ngày – Đến ngày.
- `autoApply` → `PeriodFilter` không vẽ nút "Xem báo cáo" của nó. `onFilter` chỉ `setRange(...)`; **nút "Xem" sẵn có của trang vẫn là chỗ duy nhất gọi API** (trang bắt buộc chọn tài khoản trước).
- Kỳ mặc định: **tháng hiện tại** (không phải "Năm nay" như Báo cáo tài chính).
- Muốn xem tháng của năm khác → chọn "Tùy chọn" + nhập 2 ngày (dropdown chỉ liệt kê tháng của năm nay, giống Báo cáo tài chính).

## Sửa `PeriodFilter` (`fe/src/components/shared/PeriodFilter.tsx`)

Component đang giữ state kỳ bên trong và luôn khởi tạo `'namNay'`. Hai tình huống của Sổ chi tiết cần kỳ khởi tạo từ ngoài:

1. Kỳ mặc định là tháng này.
2. **Drill-down**: trang mở từ link kèm `startDate`/`endDate` (bấm tài khoản ở Báo cáo tài chính). Dropdown phải hiện "Tùy chọn" + đúng 2 ngày của link, không được hiện "Năm nay" trong khi dữ liệu là khoảng khác.

Thêm 2 prop tùy chọn (không truyền → hành vi cũ y nguyên, Báo cáo tài chính không phải sửa):

```ts
interface PeriodFilterProps {
  onFilter: (params: PeriodFilterParams) => void;
  loading?: boolean;
  autoApply?: boolean;
  /** Kỳ chọn sẵn lúc mở trang. Mặc định 'namNay'. */
  defaultPeriod?: string;                    // 'thang7' | 'tuyChon' | ...
  /** Khoảng ngày điền sẵn khi defaultPeriod = 'tuyChon'. */
  defaultCustomRange?: [Dayjs, Dayjs];
}
```

Thêm 2 hàm export:

- `currentMonthPeriod(): string` → `'thang<tháng hiện tại>'`.
- `paramsOfPeriod(period: string): PeriodFilterParams` → khoảng ngày của một kỳ (export `buildPreset` hiện đang private dưới tên mới, để trang tính khoảng ngày khởi tạo mà không tự tính lại).

## Khởi tạo ở trang Sổ chi tiết

Kỳ + khoảng ngày khởi tạo tính **ngay trong `useState` initializer** (đọc query param đồng bộ bằng `parseReportParams`), nên lần render đầu dropdown đã đúng:

- có `startDate`/`endDate` hợp lệ trên URL → `defaultPeriod = 'tuyChon'`, `defaultCustomRange = [start, end]`, `range = [start, end]`;
- không có → `defaultPeriod = currentMonthPeriod()`, `range` = tháng hiện tại.

Hàm thuần `initialPeriod(getParam)` đặt trong `reportParams.ts` (cạnh `parseReportParams`) để test được. `useEffect` drill-down hiện có vẫn giữ nguyên phần gọi API; bỏ phần `setRange` trùng lặp.

## Kiểm thử

`PeriodFilter` chưa có test — thêm `fe/src/components/shared/PeriodFilter.test.tsx`:
- `paramsOfPeriod('thang7')` → 01/07–31/07 năm nay; `paramsOfPeriod('namTruoc')` → cả năm ngoái.
- `currentMonthPeriod()` khớp tháng hiện tại.
- Không truyền `defaultPeriod` → dropdown hiện "Năm nay" (bảo vệ Báo cáo tài chính).
- `autoApply` + chọn "Tháng 6" → `onFilter` nhận đúng 01/06–30/06.
- `defaultPeriod='tuyChon'` + `defaultCustomRange` → hiện 2 ô ngày đã điền sẵn.

`fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts`: thêm test `initialPeriod` (có param drill-down → `'tuyChon'` + đúng ngày; không param → tháng hiện tại).
