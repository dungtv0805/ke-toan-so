# Chọn cột ẩn/hiện cho toàn bộ table + siết "Đổi tiêu đề" về superAdmin

Ngày: 2026-06-28

## Bối cảnh

Trang `bao-cao/so-chi-tiet-tai-khoan` đã có tính năng chọn cột hiển thị (ColumnChooser
riêng + columnRegistry riêng, lưu localStorage). Yêu cầu: áp dụng "chọn cột ẩn/hiện"
cho **tất cả** các bảng danh sách/báo cáo; đồng thời sửa bug: nút **"Đổi tiêu đề hiển
thị"** hiện đang hiển thị cho **mọi user** (user thường vẫn override được tiêu đề ở mức
tenant) — phải giới hạn **chỉ superAdmin**.

## Phát hiện then chốt

- ~36 bảng đã dùng sẵn hook `useTableTitleConfig(pageKey, columns)` (ở
  `src/components/glossary/useTableTitleConfig.tsx`) và đều render giá trị `settingsButton`
  trả về. Đây đều là bảng danh sách/báo cáo chính, cột có `key`/`dataIndex` đầy đủ.
- Vài bảng nhóm A chưa dùng hook: `bao-cao/so-cai`, `bao-cao/bang-can-doi`, `bao-cao/pnl`.
  Riêng `so-cai` có bảng dùng **column groups** (`children`).
- Bảng nhóm B (line-items trong form/modal, preview import, dashboard) — KHÔNG thêm.
- `so-chi-tiet-tai-khoan` tự quản chọn cột (registry riêng) — GIỮ NGUYÊN, không đụng.

## Giải pháp

Gộp tính năng vào **chính `useTableTitleConfig`** để 36 bảng được áp dụng tự động (chỉ
sửa 1 file hook, không phải sửa từng trang). Giữ nguyên tên trả về `{ columns, settingsButton }`
để không phải đổi call-site.

### Phần A — Chọn cột ẩn/hiện (mọi user)

- File mới `src/components/table/columnVisibility.ts`:
  - `STORAGE_PREFIX = 'tblcols:'`, key lưu = `tblcols:{pageKey}`.
  - `loadVisibleKeys(pageKey, eligibleKeys)`: đọc localStorage, validate (mảng string,
    lọc theo `eligibleKeys` đã biết); rỗng/hỏng → trả `eligibleKeys` (mặc định hiện tất cả).
  - `saveVisibleKeys(pageKey, keys)`: ghi JSON. An toàn khi không có localStorage.
- File mới `src/components/table/ColumnChooser.tsx`:
  - Presentational. Props: `items: { key: string; title: string }[]`, `visibleKeys`,
    `onChange(keys)`.
  - Trigger: **chỉ icon** (`ControlOutlined`), Tooltip "Chọn cột" — KHÔNG có chữ.
  - Panel Dropdown: checkbox phẳng theo thứ tự cột + nút "Chọn tất cả" / "Mặc định"
    (mặc định = tất cả eligible). Toggle giữ thứ tự cột gốc.
- `useTableTitleConfig` mở rộng:
  - "eligible columns" = đúng tập `extractColTitles(columns)` (cột có title chuỗi + key/dataIndex).
    → cột thao tác (title rỗng / không key) KHÔNG xuất hiện trong chooser và **luôn hiển thị**.
  - `useState(visibleKeys)` khởi tạo từ `loadVisibleKeys(pageKey, eligibleKeys)`.
  - Lọc `mappedColumns`: bỏ cột nào là eligible nhưng không nằm trong tập visible.
  - `onChange` → `saveVisibleKeys` + `setState`.
  - Tiêu đề item trong chooser = tiêu đề sau khi đã áp override (khớp với cái user thấy).

### Phần B — Siết "Đổi tiêu đề" về superAdmin

- Trong `useTableTitleConfig`, chỉ render `<TableTitleSettings>` khi `user?.isSuperAdmin`.
- `settingsButton` trả về fragment gộp: `<ColumnChooser/>` (mọi user) + (superAdmin) `<TableTitleSettings/>`.

### Adopt thêm trang chưa dùng hook

- `bao-cao/bang-can-doi`: ĐÃ adopt — `useTableTitleConfig('baoCao.bangCanDoi', columns)`,
  render `settingsButton` ở toolbar, 2 bảng (tài sản/nguồn vốn) dùng `cfgColumns`.

### Trường hợp ĐỂ LẠI (rủi ro nếu ép vào — cần xử lý riêng)

- `bao-cao/so-cai`: các bảng dùng `Table.Summary` với `colSpan`/`index` cứng + column groups.
  Ẩn cột → lệch hàng tổng. Cần refactor summary động trước khi thêm chọn cột.
- ~~`chung-tu/nhat-ky-chung` (EntryListTab)~~ — ĐÃ LÀM. Dùng hook chung mới
  `useColumnVisibility(pageKey, columns, labelOf, { onChange })`:
  - `labelOf` đọc nhãn ngay từ định nghĩa cột: title chuỗi → dùng luôn; node `<TermText>`
    → đọc `props.tk/surface` rồi resolve qua `useTerm().t()` (khớp nhãn hiển thị).
  - Resize lưu width theo CHỈ SỐ cột (`useTableColumnResize`) → ẩn/hiện làm lệch; `onChange`
    xoá `table-col-widths-nkc-v2` để width về mặc định theo key.
  - `scroll.x` tính động theo cột đang hiện (hết khoảng trắng thừa).
- `bao-cao/pnl`: chỉ 2 cột (Khoản mục + Số tiền) → chọn cột không có ý nghĩa.

> Phần B (siết "Đổi tiêu đề" về superAdmin) ĐÃ áp ở mọi nơi, kể cả NKC, vì gate đặt ngay
> trong component `TableTitleSettings` (trả null nếu không phải superAdmin).

## Phạm vi KHÔNG làm

- Không đụng `so-chi-tiet-tai-khoan` (đã có cơ chế riêng).
- Không thêm chọn cột cho bảng nhóm B (line-items/modal/preview/dashboard).
- Không lưu lựa chọn cột lên server (chỉ localStorage per-browser, theo chốt với user).

## Kiểm thử

- Unit test cho `columnVisibility.ts`: load mặc định, load lọc key lạ, save/round-trip,
  fallback khi storage hỏng.
- Build `npm run build` + `npm run lint` sạch.
- Smoke: 1 bảng dùng hook (vd Công nợ phải thu) — chọn cột ẩn/hiện, reload giữ trạng thái;
  user thường KHÔNG thấy nút đổi tiêu đề, superAdmin thấy.
