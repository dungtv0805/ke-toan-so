# Đồng bộ giao diện dùng chung toàn dự án (theme + radius 0 + FilterBar)

**Ngày:** 2026-06-20
**Nhánh:** `feat/ui-dong-bo-toan-du-an`

## Bối cảnh
- 113 trang; **85 dùng Ant Design**, chỉ **3 file còn shadcn** (FormSkeleton nhật ký chung, KqkdFilter, KqkdTable).
- Radius rải rác: token antd `borderRadius:6` (App.tsx), `--radius:0.75rem` + 26 chỗ `border-radius` trong index.css; tailwind map theo `var(--radius)`.
- Yêu cầu: đồng bộ modal/phân trang/tabs/filter dùng chung toàn dự án; **filter gộp 1 cục** (component dùng chung); **radius = 0** toàn bộ (giữ tròn cho avatar/chấm/spinner).

## Phần 1 — Theme tập trung + radius 0 (toàn cục)
- **App.tsx ConfigProvider** là nguồn theme duy nhất: token `borderRadius/borderRadiusLG/borderRadiusSM/borderRadiusXS = 0`, giữ `colorPrimary #1890ff`. Không đổi controlHeight/fontSize (tránh xô lệch layout).
- **index.css**: `--radius: 0`; đổi các `border-radius: Npx`/`var(--radius)` → 0; **GIỮ** `border-radius: 50%` (dòng 678) và spinner.
- **tailwind.config.ts**: giữ map theo `var(--radius)` (đã thành 0); `rounded-full` vẫn tròn.
→ Modal, Pagination, Tabs, Input, Button, Card, Table, Tag... vuông góc & đồng nhất trên toàn bộ trang antd ngay lập tức.

## Phần 2 — Component Filter dùng chung
- `src/components/common/FilterBar.tsx`: khung filter "1 cục", style nhất quán (viền, nền nhạt, padding, radius 0), bố cục:
  - **trái/giữa**: ô tìm kiếm (prop `search`) + nút đặt lại (prop `onReset`) + vùng control lọc (prop `filters: ReactNode`).
  - **phải**: nút hành động (prop `actions: ReactNode`).
- CSS class `.filter-bar` trong index.css.
- API:
  ```ts
  interface FilterBarProps {
    search?: { value: string; onChange: (v: string) => void; onSearch?: () => void; placeholder?: string; width?: number };
    onReset?: () => void;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
  }
  ```

## Phần 3 — Áp dụng
- **Phiếu thu/chi**: `components/filter/FilterBar.tsx` (cục bộ) chuyển sang dùng `<FilterBar>` chung.
- **17 trang Danh mục**: bọc toolbar (search + reload + nút Thêm/Export) bằng `<FilterBar>` chung. Giữ nguyên logic/handler từng trang.
- **3 file shadcn → antd**: `FormSkeleton.tsx` (antd Skeleton), `KqkdTable.tsx` (antd Table excel-table), `KqkdFilter.tsx` (dùng `<FilterBar>` chung).

## Kiểm thử
- `tsc --noEmit` 0 lỗi; `vitest run` toàn bộ pass; `npm run build` thành công.
- Kiểm thị giác: radius 0 ở modal/tabs/pagination/filter/table; hình tròn (avatar/chấm) vẫn tròn; filter các trang là 1 cục đồng nhất.

## Ngoài phạm vi (YAGNI)
- Không đổi colorPrimary/sizing tokens (chỉ radius).
- Không viết lại wrapper riêng cho Modal/Tabs/Pagination (theme đã phủ).
- Không refactor logic nghiệp vụ từng trang.
