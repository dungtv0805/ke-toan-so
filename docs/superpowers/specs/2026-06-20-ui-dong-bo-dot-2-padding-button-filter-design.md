# Đồng bộ giao diện — Đợt 2 (padding + chiều cao control + FilterBar toàn bộ + Mở/Thu gọn)

**Ngày:** 2026-06-20
**Nhánh:** `feat/ui-dong-bo-dot-2`
**Tiếp nối:** [2026-06-20-ui-dong-bo-toan-du-an-design.md](./2026-06-20-ui-dong-bo-toan-du-an-design.md) (đợt 1: radius 0 + FilterBar cho danh mục/phiếu/kqkd).

## Bối cảnh — vấn đề tìm được (audit 2026-06-20)
Đợt 1 đã chuẩn hóa radius 0 và FilterBar cho 17 trang danh mục + phiếu + kqkd, nhưng **cố tình không đụng controlHeight/sizing** để tránh xô layout. Hệ quả còn lại lộn xộn:

1. **Padding container — 7 kiểu khác nhau.** `MainLayout` Content đã có `p-2 sm:p-3` (8–12px) nhưng nhiều trang tự thêm padding chồng lên → double padding:
   - `space-y-6` (0 padding): ~17 trang danh mục
   - `p-6` (24px): 3 trang cấu hình (tenant, vai-tro, thanh-vien)
   - `p-4` (16px): kqkd
   - inline `24px`/`24`: cong-no phai-tra, phai-thu, so-cai, bang-can-doi, pnl, quy-chuan
   - `12px 24px`: phan-quyen
   - `8px 16px`: bao-cao tai-chinh
   - không có: so-du-dau-ky, bang-tong-hop, so-chi-tiet-tai-khoan, placeholder...
2. **Chiều cao control không đồng nhất.** Theme không set `controlHeight` → mặc định 32px; 14 chỗ ép `size="small"` (24px) trộn với nút mặc định ngay trong cùng trang.
3. **FilterBar chưa phủ hết.** Chỉ ~16 trang danh mục dùng. Còn tự chế filter trong `Card.extra`: báo cáo (so-cai, bang-can-doi, pnl, tai-chinh, so-chi-tiet-tai-khoan, bang-tong-hop), công nợ (phai-thu/phai-tra), sổ quỹ.
4. **Mở/Thu gọn (tree) lặp 4 chỗ, nút chữ rời.** so-du-dau-ky + bao-cao tai-chinh (×3: cân đối TK, tài sản, nguồn vốn) — `<Button size="small">Mở tất cả</Button>` / `Thu gọn` rời rạc.

## Quyết định chốt với người dùng
- **Density:** `controlHeight = 28` (compact, hợp app kế toán nhiều bảng).
- **Padding:** 1 nguồn duy nhất ở layout = **12px**; mọi trang **không tự set padding**.
- **Mở/Thu gọn:** component dùng chung, **2 nút icon + tooltip**, canh phải.

---

## Phần 1 — Chiều cao control đồng nhất (toàn cục)
- **App.tsx ConfigProvider** (nguồn theme duy nhất) thêm token sizing — KHÔNG đổi radius/colorPrimary đã có:
  ```ts
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 0, borderRadiusLG: 0, borderRadiusSM: 0, borderRadiusXS: 0, // giữ từ đợt 1
    controlHeight: 28,     // mặc định Button/Input/Select/DatePicker
    controlHeightSM: 24,   // size="small"
    controlHeightLG: 36,   // size="large"
  }
  ```
- **Quy ước dùng `size`:**
  - Nút hành động (Thêm / Xuất Excel / Làm mới / Xem báo cáo / Lưu...) và ô filter: **mặc định** (28px) — **bỏ** `size="small"` đang ép thủ công.
  - **Chỉ giữ `size="small"`** cho: nút icon **inline trong dòng bảng** (sửa/xóa từng dòng) và `ExpandCollapseButtons`.
- **index.css**: rà lại các override `.ant-btn-sm { height: 24px }` trong `.excel-table` — giữ (khớp controlHeightSM=24). Không thêm `!important` height cho nút thường.

→ Mọi button/input/select cùng cao 28px; hết cảnh "cái to cái nhỏ".

## Phần 2 — Padding đồng nhất 1 nguồn
- **MainLayout.tsx** Content: bỏ `className="p-2 sm:p-3"`, set **`padding: 12`** cố định (giữ `height: calc(100vh - 48px)`, `overflow: auto`).
- **Mọi page root**: gỡ padding tự thêm:
  - Gỡ inline `padding: '24px'`/`24`/`'8px 16px'`/`'12px 24px'`.
  - Gỡ Tailwind `p-6`/`p-4`/`p-2` ở root page.
- **Khoảng cách dọc giữa các khối**: chuẩn hóa về **`space-y-3` (12px)** cho mọi page root (thay `space-y-6`/`space-y-4` lẻ tẻ) — nhịp 12px khớp padding 12px.
- **Trang full-height** (tai-chinh, phan-quyen, nhat-ky-chung): dùng `height: '100%'` + `display:flex; flexDirection:column; overflow:hidden` thay cho `calc(100vh - 48px)` (tránh cộng dồn chiều cao với Content đã trừ 48px). Trang tự quản scroll bên trong.

→ Mọi trang lề 12px đều nhau; không double padding.

## Phần 3 — FilterBar phủ các trang còn lại
Chuyển filter tự chế (`Card.extra` / `Space` rời) sang `<FilterBar>` chung (giữ nguyên logic/handler):
- **Công nợ**: `CongNoPhaiTraPage`, `CongNoPhaiThuPage` — search NCC + nút Xuất Excel/Làm mới → `search` + `actions`.
- **Sổ quỹ**: `SoQuyPage` — search + RangePicker → `search` + `filters` (RangePicker) + `actions`.
- **Báo cáo**:
  - `SoCaiPage`: Select tài khoản → `filters`; actions Xuất/Làm mới.
  - `SoChiTietTaiKhoanPage`: gom control kỳ/tài khoản vào `filters`.
  - `PnLPage`, `BaoCaoTaiChinhPage`: bộ lọc kỳ (`PeriodFilter`) đặt trong `<FilterBar>` (filters = các select kỳ, actions = "Xem báo cáo").
  - **KHÔNG migrate** `BangCanDoiPage`, `BangTongHopCongNoPage` (điều hướng bằng cây, không có filter rõ ràng) — chỉ áp Phần 1 + 2.
- **PeriodFilter.tsx** (chỉ dùng ở tai-chinh): bỏ các `Typography.Text` label rời + `Space wrap`; render các select kỳ trên 1 hàng không wrap, dùng làm `filters` của FilterBar, thêm icon `CalendarOutlined` đầu hàng; link "Tùy chọn/Theo kỳ" giữ chức năng.

> Lưu ý phạm vi: các trang cấu hình (tenant/vai-tro/thanh-vien/phan-quyen) theo handler-pattern, không có filter list — chỉ áp Phần 1 + 2, không thêm FilterBar.

## Phần 4 — Component Mở/Thu gọn dùng chung
- Tạo `src/components/common/ExpandCollapseButtons.tsx`:
  ```ts
  interface ExpandCollapseButtonsProps {
    onExpandAll: () => void;
    onCollapseAll: () => void;
    size?: 'small' | 'middle';   // mặc định 'small'
  }
  ```
  - 2 nút icon trong `Button.Group`: `PlusSquareOutlined` (Mở tất cả) + `MinusSquareOutlined` (Thu gọn), mỗi nút bọc `Tooltip`. Canh phải.
- **Áp dụng 4 chỗ tree**: `BaoCaoTaiChinhPage` (cân đối TK, tài sản, nguồn vốn) + `SoDuDauKyPage`. Giữ nguyên `collectParentKeys`/`collectExpandKeys` + state hiện có; chỉ thay phần JSX 2 nút chữ.
- **Ngoài phạm vi đợt này**: nút "Mở rộng/Thu gọn" của *thẻ thống kê* (StatsCards, SoQuy) là toggle panel khác bản chất — giữ nguyên.

## Phần 5 — Chuẩn tiêu đề trang (title) = chỉ Breadcrumb
**Vấn đề:** Toàn bộ báo cáo/công nợ/phiếu (và 5 trang danh mục: tai-khoan, doi-tuong, chu-dau-tu, nhom-quan-ly, nhom-khuyen-mai — header đã comment) chỉ hiển thị **Breadcrumb**. Nhưng **9 trang danh mục** còn render `Title level={3}` + icon + subtitle → lệch hẳn.

**Chuẩn:** Mọi trang chỉ dùng **Breadcrumb** làm tiêu đề, **không** `Title level={3}` + subtitle ở đầu trang.

**Áp dụng — gỡ khối header title ở 9 trang danh mục** (giữ Breadcrumb):
`ngan-hang`, `loai-chung-tu`, `loai-giao-dich`, `dong-tien`, `khoan-muc`, `san-pham`, `du-an`, `nhom-khoan-muc`, `bo-phan`.
- Gỡ khối `<div className="flex flex-col sm:flex-row justify-between ...">` chứa `<Title level={3}>` + `<Text type="secondary">`.
- Nếu khối đó có **nút hành động** (Space bên phải: Thêm/Xuất/Làm mới) → chuyển vào `actions` của `<FilterBar>` sẵn có của trang (cả 9 trang đều đã dùng FilterBar). Không làm mất nút.
- Giữ nguyên Breadcrumb, Stats Cards (nếu có), bảng.

> Các trang đã comment header (5 trang trên) giữ nguyên (đã breadcrumb-only). Không "thêm title" vào báo cáo/công nợ/phiếu.

## Kiểm thử
- `tsc --noEmit` 0 lỗi; `vitest run` pass (đặc biệt `buildAccountTree.test.ts`); `npm run build` thành công.
- Kiểm thị giác từng nhóm: button/input cùng cao 28px; lề 12px đều mọi trang; FilterBar đồng nhất ở báo cáo/công nợ/sổ quỹ; nút Mở/Thu gọn là 2 icon có tooltip.

## Ngoài phạm vi (YAGNI)
- Không đổi `colorPrimary`/`fontSize`/màu.
- Không refactor logic nghiệp vụ từng trang.
- Không gộp nút collapse thẻ thống kê vào ExpandCollapseButtons.
- Không tạo abstraction `PageContainer` (đã chọn để padding ở layout).
