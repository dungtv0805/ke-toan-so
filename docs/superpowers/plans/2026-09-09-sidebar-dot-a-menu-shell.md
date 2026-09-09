# Đợt A — Menu 12 phân hệ + sidebar rail/panel/flyout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay sidebar menu xổ nhiều cấp bằng rail 62px + panel 196px + flyout, đọc từ `menuCatalog.ts` mới gom 74 mục vào 12 phân hệ nghiệp vụ.

**Architecture:** `config/menuCatalog.ts` thành nguồn duy nhất (12 `MenuModule` + 74 `MenuLeaf`). Tám component nhỏ trong `components/layout/sidebar/`, trong đó `MenuItemList` dùng chung cho panel · flyout · drawer mobile nên ba chỗ không thể lệch nhau. `MainLayout` bỏ toàn bộ menu hard-code, chỉ còn bố cục. Hai tầng lọc (lĩnh vực → quyền) giữ nguyên cách hoạt động.

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind · antd 5 (giữ cho Tooltip/Dropdown, **bỏ** `antd Menu` trong sidebar) · vitest + @testing-library/react · react-router-dom v6

**Spec:** `docs/superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md` (đọc cả Phần I và Phần II)

## Global Constraints

- **Không đổi logic nghiệp vụ.** Không đụng cột bảng, filter, phân trang, lời gọi API, công thức tính. Đợt A chỉ đổi điều hướng.
- **Không đổi một ký tự nào của key quyền.** `routePermissions` sinh ra phải là tập con của bản cũ (test bắt buộc, Task 2).
- **Không đợt nào được làm mất lối vào một trang đang chạy thật** (spec §14.4).
- Trang chưa có → mục vẫn hiện trên sidebar, làm mờ + chấm cam, bấm vào ra `ComingSoonPage` với đúng câu "Tính năng này đang được phát triển và sẽ sớm ra mắt!". **Không dựng màn hình mới nào.**
- Giữ `@ant-design/icons`. Không đổi sang lucide trong đợt này.
- Không dựng thẻ "Kỳ kế toán" ở đáy panel (thiếu API — spec §14.2). Để `ModulePanel` chừa chỗ bằng `<div className="flex-1" />`.
- Kích thước cố định (spec §2.1): rail 62px · panel 196px · rail item cao 40px, icon 17px, nhãn 8.5px · nav item cao 19px, chữ 11.5px, bo 6px · panel padding 10/8px, gap 0 · tiêu đề panel 15px/700 · caption cụm 8.5px/700 letter-spacing 0.6.
- Chạy trong `fe/`. Nghiệm thu mỗi task: `npm test` + `npm run lint`. Cuối đợt thêm `npm run build`.
- `vite build` **không** typecheck. Chạy `npx tsc --noEmit` và so **số lỗi** với baseline trước khi sửa — repo có lỗi tsc sẵn, không đòi sạch trơn.

---

## File Structure

**Tạo mới**
| File | Trách nhiệm |
|---|---|
| `src/config/menuCatalog.ts` | *(viết đè file cũ)* kiểu + dữ liệu 12 phân hệ / 74 mục + helper truy vấn |
| `src/config/menuCatalog.test.ts` | 4 test giữ nhà (catalog ↔ routes ↔ quyền) |
| `src/components/layout/sidebar/useSidebarState.ts` | thu gọn · phân hệ đang mở · lưu localStorage · phím `⌘\` |
| `src/components/layout/sidebar/MenuItemList.tsx` | danh sách mục con — dùng chung panel/flyout/drawer |
| `src/components/layout/sidebar/MenuItemList.test.tsx` | test mục `soon`, caption cụm, mục đang chọn |
| `src/components/layout/sidebar/SidebarRail.tsx` | 12 ô phân hệ + tooltip |
| `src/components/layout/sidebar/SidebarSearch.tsx` | ô tìm ⌘K xuyên 74 mục |
| `src/components/layout/sidebar/HelpMenu.tsx` | "Trợ giúp & phản hồi" — 4 trang thư viện |
| `src/components/layout/sidebar/ModulePanel.tsx` | tiêu đề + tìm + danh sách + đáy |
| `src/components/layout/sidebar/ModuleFlyout.tsx` | popover khi thu gọn |
| `src/components/layout/sidebar/Sidebar.tsx` | ghép rail + panel/flyout |
| `src/components/layout/sidebar/MobileMenu.tsx` | drawer 2 lớp |
| `src/components/layout/sidebar/index.ts` | re-export |
| `src/hooks/useVisibleMenu.ts` | lọc catalog theo lĩnh vực + quyền, trả 12 phân hệ đã lọc |
| `src/hooks/useVisibleMenu.test.ts` | test hai tầng lọc |

**Sửa**
| File | Sửa gì |
|---|---|
| `src/components/layout/MainLayout.tsx` | xoá menu hard-code + `filterByModule`/`filterMenuItems`/`createLabel`/`getItem`/`getMenuItem`/`relabelMenu`/`existingRoutes`; render `<Sidebar/>` và `<MobileMenu/>` |
| `src/pages/ComingSoon.tsx` | bỏ `pathTitles` hard-code, lấy nhãn từ `menuCatalog` |
| `src/App.tsx` | thêm route `ComingSoonPage` cho các mục `soon` chưa có route |
| `src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx` | đọc `?tab=` để chọn tab đầu (3 dòng) |
| `src/index.css` | xoá khối CSS đè `.ant-menu-*` của sidebar cũ |

---

### Task 1: Kiểu dữ liệu + dữ liệu `menuCatalog.ts`

**Files:**
- Modify (viết đè): `fe/src/config/menuCatalog.ts`
- Test: `fe/src/config/menuCatalog.test.ts` (tạo ở Task 2)

**Interfaces:**
- Consumes: `DANH_MUC_ROUTES` từ `@/config/danhMucCatalog`
- Produces: `ModuleId`, `MenuModule`, `MenuLeaf`, `MENU_MODULES`, `MENU_LEAVES`, `MENU_CATALOG` (giữ tên cũ cho tương thích), `leavesOfModule(id)`, `leafByKey(key)`, `routeOf(leaf)`, `permKeyOf(leaf)`, `flattenMenuKeys()`

- [ ] **Step 1: Viết file mới**

```ts
import React from 'react';
import {
  DashboardOutlined, LineChartOutlined, BookOutlined, DollarOutlined,
  ShoppingOutlined, ShoppingCartOutlined, TeamOutlined, InboxOutlined,
  CarOutlined, ToolOutlined, CalculatorOutlined, DatabaseOutlined,
  PieChartOutlined, RiseOutlined, StockOutlined, ReconciliationOutlined,
  AccountBookOutlined, FileSearchOutlined, ProfileOutlined, TableOutlined,
  AuditOutlined, SwapOutlined, ScheduleOutlined, CreditCardOutlined,
  WalletOutlined, FileProtectOutlined, FileTextOutlined, BarChartOutlined,
  AppstoreOutlined, ContainerOutlined, SnippetsOutlined, FileAddOutlined,
  FileDoneOutlined, BellOutlined, SafetyCertificateOutlined, FundOutlined,
} from '@ant-design/icons';
import { DANH_MUC_ROUTES } from './danhMucCatalog';

export type ModuleId =
  | 'tong-quan' | 'phan-tich' | 'tong-hop' | 'von-dong-tien'
  | 'mua-hang' | 'ban-hang' | 'tien-luong' | 'kho'
  | 'tai-san' | 'ccdc' | 'thue' | 'danh-muc';

export interface MenuModule {
  id: ModuleId;
  /** Tiêu đề panel. */
  label: string;
  /** Nhãn dưới icon rail — viết tắt cho vừa 62px. */
  railLabel: string;
  icon: React.ReactNode;
  /** Nhóm 1 mục → bấm rail vào thẳng, không mở panel. */
  route?: string;
  /** Mở được khi có quyền xem ÍT NHẤT 1 route trong danh sách (mục gộp). */
  aggregateRoutes?: string[];
}

export interface MenuLeaf {
  /** Đích điều hướng. Được phép mang query string (xem permKey). */
  key: string;
  label: string;
  module: ModuleId;
  /** Caption cụm trong panel, viết HOA. */
  cluster?: string;
  /** 'soon' = chưa có route HOẶC route đang trỏ ComingSoonPage. */
  status: 'ok' | 'soon';
  icon?: React.ReactNode;
  /** Khóa quyền khi khác key (mục mang query string). KHÔNG BAO GIỜ đổi giá trị này. */
  permKey?: string;
  /** Nhãn đổi theo ngành (glossary). */
  termKey?: string;
  /** Giữ route + giữ quyền nhưng KHÔNG hiện trên sidebar. */
  legacy?: true;
}

export const MENU_MODULES: MenuModule[] = [
  { id: 'tong-quan',     label: 'Tổng quan',          railLabel: 'Tổng quan', icon: <DashboardOutlined />, route: '/' },
  { id: 'phan-tich',     label: 'Phân tích',          railLabel: 'Phân tích', icon: <LineChartOutlined /> },
  { id: 'tong-hop',      label: 'Tổng hợp',           railLabel: 'Tổng hợp',  icon: <BookOutlined /> },
  { id: 'von-dong-tien', label: 'Vốn & dòng tiền',    railLabel: 'Dòng tiền', icon: <DollarOutlined /> },
  { id: 'mua-hang',      label: 'Mua hàng',           railLabel: 'Mua hàng',  icon: <ShoppingOutlined /> },
  { id: 'ban-hang',      label: 'Bán hàng',           railLabel: 'Bán hàng',  icon: <ShoppingCartOutlined /> },
  { id: 'tien-luong',    label: 'Tiền lương',         railLabel: 'Tiền lương', icon: <TeamOutlined /> },
  { id: 'kho',           label: 'Kho',                railLabel: 'Kho',       icon: <InboxOutlined /> },
  { id: 'tai-san',       label: 'Tài sản',            railLabel: 'Tài sản',   icon: <CarOutlined /> },
  { id: 'ccdc',          label: 'Công cụ dụng cụ',    railLabel: 'CCDC',      icon: <ToolOutlined /> },
  { id: 'thue',          label: 'Thuế',               railLabel: 'Thuế',      icon: <CalculatorOutlined /> },
  { id: 'danh-muc',      label: 'Danh mục',           railLabel: 'Danh mục',  icon: <DatabaseOutlined />, route: '/danh-muc', aggregateRoutes: DANH_MUC_ROUTES },
];

export const MENU_LEAVES: MenuLeaf[] = [
  // ===== 1. Tổng quan (1) =====
  { key: '/', label: 'Bảng điều hành', module: 'tong-quan', status: 'ok', icon: <DashboardOutlined /> },

  // ===== 2. Phân tích (9) =====
  { key: '/phan-tich/ban-hang', label: 'Bán hàng', module: 'phan-tich', status: 'soon', icon: <ShoppingCartOutlined /> },
  { key: '/phan-tich/mua-hang', label: 'Mua hàng', module: 'phan-tich', status: 'soon', icon: <ShoppingOutlined /> },
  { key: '/phan-tich/cong-no', label: 'Công nợ', module: 'phan-tich', status: 'soon', icon: <ReconciliationOutlined /> },
  { key: '/phan-tich/dong-tien', label: 'Dòng tiền', module: 'phan-tich', status: 'soon', icon: <DollarOutlined /> },
  { key: '/phan-tich/ton-kho', label: 'Tồn kho', module: 'phan-tich', status: 'soon', icon: <InboxOutlined /> },
  { key: '/phan-tich/bao-cao-tai-chinh', label: 'P&L', module: 'phan-tich', status: 'soon', icon: <PieChartOutlined /> },
  { key: '/bao-cao/pnl-khong-khau-hao', label: 'P&L không khấu hao', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/pnl-3-lop', label: 'P&L so sánh KH-DB-TH', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản', module: 'phan-tich', status: 'soon', icon: <StockOutlined /> },

  // ===== 3. Tổng hợp (9 ở đợt A — cụm BCTC còn 1 mục, đợt C tách thành 4) =====
  { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'ok', icon: <AccountBookOutlined /> },
  { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'soon', icon: <FileSearchOutlined /> },
  { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/chung-tu/nhat-ky-chung', label: 'Sổ nhật ký chung', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'ok', icon: <AuditOutlined /> },
  { key: '/bao-cao/bang-tong-hop', label: 'Tổng hợp công nợ', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'ok', icon: <TableOutlined /> },
  { key: '/tong-hop/quyet-toan-tam-ung', label: 'Quyết toán tạm ứng', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'soon', icon: <FileTextOutlined /> },
  { key: '/chung-tu/ket-chuyen-lai-lo', label: 'Kết chuyển', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'ok', icon: <SwapOutlined /> },
  { key: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/tai-chinh/thuyet-minh', label: 'Thuyết minh', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'soon', icon: <FileTextOutlined /> },

  // ===== 4. Vốn & dòng tiền (5) =====
  { key: '/trung-tam-du-lieu/ke-hoach?tab=dong-tien', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch ngân sách', module: 'von-dong-tien', status: 'ok', icon: <ScheduleOutlined /> },
  { key: '/trung-tam-du-lieu/du-bao?tab=dong-tien', permKey: '/trung-tam-du-lieu/du-bao', label: 'Dự báo ngân sách', module: 'von-dong-tien', status: 'ok', icon: <RiseOutlined /> },
  { key: '/so-quy', label: 'Sổ quỹ', module: 'von-dong-tien', status: 'ok', icon: <WalletOutlined /> },
  { key: '/chung-tu/phieu-thu', label: 'Phiếu thu', module: 'von-dong-tien', status: 'ok', icon: <CreditCardOutlined /> },
  { key: '/chung-tu/phieu-chi', label: 'Phiếu chi', module: 'von-dong-tien', status: 'ok', icon: <WalletOutlined /> },

  // ===== 5. Mua hàng (8) =====
  { key: '/mua-hang/ke-hoach', label: 'Kế hoạch mua hàng', module: 'mua-hang', status: 'soon', icon: <ScheduleOutlined /> },
  { key: '/mua-hang/du-bao', label: 'Dự báo mua hàng', module: 'mua-hang', status: 'soon', icon: <RiseOutlined /> },
  { key: '/mua-hang/hop-dong', label: 'Hợp đồng mua', module: 'mua-hang', status: 'soon', icon: <FileProtectOutlined /> },
  { key: '/mua-hang/mua-hang', label: 'Mua hàng', module: 'mua-hang', status: 'soon', icon: <ShoppingOutlined /> },
  { key: '/mua-hang/so-chi-tiet', label: 'Sổ chi tiết mua hàng', module: 'mua-hang', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/mua-hang/tong-hop', label: 'Tổng hợp mua hàng', module: 'mua-hang', status: 'soon', icon: <TableOutlined /> },
  { key: '/cong-no/phai-tra', label: 'Công nợ phải trả', module: 'mua-hang', status: 'ok', icon: <ReconciliationOutlined /> },
  { key: '/mua-hang/bao-cao', label: 'Báo cáo', module: 'mua-hang', status: 'soon', icon: <BarChartOutlined /> },

  // ===== 6. Bán hàng (10) =====
  { key: '/trung-tam-du-lieu/ke-hoach?tab=ban-hang', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch bán hàng', module: 'ban-hang', status: 'ok', icon: <ScheduleOutlined /> },
  { key: '/trung-tam-du-lieu/du-bao?tab=ban-hang', permKey: '/trung-tam-du-lieu/du-bao', label: 'Dự báo bán hàng', module: 'ban-hang', status: 'ok', icon: <RiseOutlined /> },
  { key: '/trung-tam-du-lieu/hop-dong', label: 'Hợp đồng bán', module: 'ban-hang', status: 'ok', icon: <FileProtectOutlined /> },
  { key: '/ban-hang/don-hang', label: 'Đơn hàng', module: 'ban-hang', status: 'soon', icon: <FileDoneOutlined /> },
  { key: '/ban-hang/so-chi-tiet', label: 'Sổ chi tiết bán hàng', module: 'ban-hang', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/ban-hang/tong-hop', label: 'Tổng hợp bán hàng', module: 'ban-hang', status: 'soon', icon: <TableOutlined /> },
  { key: '/cong-no/phai-thu', label: 'Công nợ phải thu', module: 'ban-hang', status: 'ok', icon: <ReconciliationOutlined /> },
  { key: '/bao-cao/hop-dong', label: 'Báo cáo', module: 'ban-hang', status: 'ok', icon: <BarChartOutlined /> },
  { key: '/bao-cao/doanh-thu', label: 'Báo cáo doanh thu', module: 'ban-hang', status: 'ok', icon: <RiseOutlined /> },
  { key: '/ban-hang/nhac-no', label: 'Nhắc nợ', module: 'ban-hang', status: 'soon', icon: <BellOutlined /> },

  // ===== 7. Tiền lương (7) =====
  { key: '/trung-tam-du-lieu/ke-hoach?tab=nhan-su', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch tiền lương', module: 'tien-luong', status: 'ok', icon: <ScheduleOutlined /> },
  { key: '/trung-tam-du-lieu/du-bao?tab=nhan-su', permKey: '/trung-tam-du-lieu/du-bao', label: 'Dự báo tiền lương', module: 'tien-luong', status: 'ok', icon: <RiseOutlined /> },
  { key: '/tien-luong/tinh-luong', label: 'Tính lương', module: 'tien-luong', status: 'soon', icon: <CalculatorOutlined /> },
  { key: '/tien-luong/so-chi-tiet', label: 'Sổ chi tiết tiền lương', module: 'tien-luong', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/tien-luong/bhxh', label: 'BHXH', module: 'tien-luong', status: 'soon', icon: <SafetyCertificateOutlined /> },
  { key: '/tien-luong/cong-no', label: 'Công nợ lương', module: 'tien-luong', status: 'soon', icon: <ReconciliationOutlined /> },
  { key: '/tien-luong/bao-cao', label: 'Báo cáo', module: 'tien-luong', status: 'soon', icon: <BarChartOutlined /> },

  // ===== 8. Kho (9) =====
  { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok', icon: <FileAddOutlined /> },
  { key: '/kho/xuat-kho', label: 'Xuất kho', module: 'kho', status: 'ok', icon: <FileDoneOutlined /> },
  { key: '/kho/chuyen-kho', label: 'Chuyển kho', module: 'kho', status: 'ok', icon: <SwapOutlined /> },
  { key: '/kho/tinh-gia-xuat', label: 'Tính giá xuất kho', module: 'kho', status: 'soon', icon: <CalculatorOutlined /> },
  { key: '/kho/tong-hop-xuat', label: 'Tổng hợp xuất kho', module: 'kho', status: 'soon', icon: <TableOutlined /> },
  { key: '/kho/nhap-xuat-ton', label: 'Báo cáo nhập xuất tồn', module: 'kho', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Hàng hóa', module: 'kho', cluster: 'NHÓM HÀNG', status: 'ok', icon: <AppstoreOutlined /> },
  { key: '/trung-tam-du-lieu/nguyen-lieu', label: 'Nguyên vật liệu', module: 'kho', cluster: 'NHÓM HÀNG', status: 'ok', icon: <ContainerOutlined /> },
  { key: '/trung-tam-du-lieu/van-phong-pham', label: 'Văn phòng phẩm', module: 'kho', cluster: 'NHÓM HÀNG', status: 'ok', icon: <SnippetsOutlined /> },

  // ===== 9. Tài sản (7) =====
  { key: '/trung-tam-du-lieu/ke-hoach?tab=tai-san', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch tài sản', module: 'tai-san', status: 'ok', icon: <ScheduleOutlined /> },
  { key: '/trung-tam-du-lieu/du-bao?tab=tai-san', permKey: '/trung-tam-du-lieu/du-bao', label: 'Dự báo tài sản', module: 'tai-san', status: 'ok', icon: <RiseOutlined /> },
  { key: '/tai-san/danh-muc', label: 'Danh mục tài sản', module: 'tai-san', status: 'soon', icon: <DatabaseOutlined /> },
  { key: '/trung-tam-du-lieu/tai-san', label: 'Tài sản', module: 'tai-san', status: 'soon', icon: <CarOutlined /> },
  { key: '/tai-san/khau-hao', label: 'Tính khấu hao', module: 'tai-san', status: 'soon', icon: <FundOutlined /> },
  { key: '/tai-san/dieu-chuyen', label: 'Điều chuyển', module: 'tai-san', status: 'soon', icon: <SwapOutlined /> },
  { key: '/tai-san/ghi-giam', label: 'Ghi giảm TS', module: 'tai-san', status: 'soon', icon: <FileTextOutlined /> },

  // ===== 10. Công cụ dụng cụ (4) =====
  { key: '/trung-tam-du-lieu/dung-cu', label: 'Công cụ dụng cụ', module: 'ccdc', status: 'ok', icon: <ToolOutlined /> },
  { key: '/ccdc/phan-bo', label: 'Bảng phân bổ', module: 'ccdc', status: 'soon', icon: <TableOutlined /> },
  { key: '/ccdc/dieu-chuyen', label: 'Điều chuyển', module: 'ccdc', status: 'soon', icon: <SwapOutlined /> },
  { key: '/ccdc/danh-muc', label: 'Danh mục dụng cụ', module: 'ccdc', status: 'soon', icon: <DatabaseOutlined /> },

  // ===== 11. Thuế (4) =====
  { key: '/thue/bang-ke-mua-vao', label: 'Bảng kê mua vào', module: 'thue', status: 'ok', icon: <FileAddOutlined /> },
  { key: '/thue/bang-ke-ban-ra', label: 'Bảng kê bán ra', module: 'thue', status: 'ok', icon: <FileDoneOutlined /> },
  { key: '/thue/tong-hop', label: 'Bảng tổng hợp thuế', module: 'thue', status: 'ok', icon: <TableOutlined /> },
  { key: '/thue/bao-cao-tndn', label: 'Báo cáo tạm tính TNDN', module: 'thue', status: 'ok', icon: <BarChartOutlined /> },

  // ===== 12. Danh mục (1) — 26 trang con lấy từ danhMucCatalog.ts =====
  { key: '/danh-muc', label: 'Danh mục', module: 'danh-muc', status: 'ok', icon: <DatabaseOutlined /> },

  // ===== LEGACY — giữ route + giữ quyền, KHÔNG hiện trên sidebar =====
  { key: '/bep-an/dinh-muc-tien-an', label: 'Định mức tiền ăn', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/bep-an/cong-thuc-dinh-luong', label: 'Công thức định lượng', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/bep-an/diem-danh-an', label: 'Điểm danh ăn', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/bep-an/de-xuat-mua', label: 'Đề xuất mua', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/bep-an/kiem-soat-chi-phi', label: 'Kiểm soát chi phí', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/thu-tien-hop-dong', label: 'Thu tiền hợp đồng', module: 'ban-hang', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/hd-ban-ra', label: 'Hóa đơn bán ra', module: 'ban-hang', status: 'ok', legacy: true },
  { key: '/bao-cao/so-cai', label: 'Sổ cái', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/bao-cao/pnl', label: 'P&L', module: 'phan-tich', status: 'ok', legacy: true },
  { key: '/bao-cao/bang-can-doi', label: 'Bảng cân đối', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch', module: 'von-dong-tien', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo', module: 'von-dong-tien', status: 'ok', legacy: true },
  { key: '/quy-trinh', label: 'Quy trình', module: 'danh-muc', status: 'ok', legacy: true },
  { key: '/chinh-sach', label: 'Chính sách', module: 'danh-muc', status: 'ok', legacy: true },
  { key: '/bieu-mau', label: 'Biểu mẫu', module: 'danh-muc', status: 'ok', legacy: true },
  { key: '/huong-dan', label: 'Hướng dẫn', module: 'danh-muc', status: 'ok', legacy: true },
  { key: '/cau-hinh/linh-vuc', label: 'Lĩnh vực', module: 'danh-muc', status: 'ok', legacy: true },
];

/** Đường dẫn để navigate (gồm cả query nếu có). */
export const routeOf = (leaf: MenuLeaf): string => leaf.key;

/** Pathname không query — dùng để so với location.pathname. */
export const pathOf = (leaf: MenuLeaf): string => leaf.key.split('?')[0];

/** Khóa quyền. permKey khi mục mang query string; còn lại là chính key. */
export const permKeyOf = (leaf: MenuLeaf): string => leaf.permKey ?? pathOf(leaf);

/** Mục hiện trên sidebar của một phân hệ, giữ nguyên thứ tự khai báo. */
export const leavesOfModule = (id: ModuleId): MenuLeaf[] =>
  MENU_LEAVES.filter((l) => l.module === id && !l.legacy);

export const leafByKey = (key: string): MenuLeaf | undefined =>
  MENU_LEAVES.find((l) => l.key === key);

/** Nhãn hiển thị của một pathname — ComingSoon dùng để đặt tiêu đề. */
export const labelByPath = (path: string): string | undefined =>
  MENU_LEAVES.find((l) => pathOf(l) === path)?.label;

/** Mọi khóa quyền sinh từ catalog (mục soon không sinh — chưa có gì để cấp). */
export const permissionKeys = (): string[] =>
  Array.from(
    new Set(MENU_LEAVES.filter((l) => l.status === 'ok').map(permKeyOf)),
  );

// ===== Tương thích ngược — useEffectiveMenuKeys và trang Danh mục đang dùng =====
export interface MenuCatalogEntry {
  key: string;
  label: string;
  parentLabel?: string;
}

export const MENU_CATALOG: MenuCatalogEntry[] = MENU_LEAVES.map((l) => ({
  key: pathOf(l),
  label: l.label,
  parentLabel: MENU_MODULES.find((m) => m.id === l.module)?.label,
}));

export const flattenMenuKeys = (
  entries: MenuCatalogEntry[] = MENU_CATALOG,
): string[] => entries.map((e) => e.key);
```

- [ ] **Step 2: Đổi đuôi file sang `.tsx`**

File có JSX (icon) nên phải là `.tsx`:

```bash
cd fe
git mv src/config/menuCatalog.ts src/config/menuCatalog.tsx
```

Import `@/config/menuCatalog` không có đuôi nên **không nơi nào phải sửa import**.

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep menuCatalog`
Expected: không có dòng nào.

- [ ] **Step 4: Commit**

```bash
cd fe
git add src/config/menuCatalog.tsx
git commit -m "feat(menu): viết lại menuCatalog thành 12 phân hệ / 74 mục"
```

---

### Task 2: Bốn test giữ nhà

**Files:**
- Create: `fe/src/config/menuCatalog.test.ts`
- Create: `fe/src/config/__snapshots__/permission-keys-truoc-doi.json`

**Interfaces:**
- Consumes: `MENU_MODULES`, `MENU_LEAVES`, `pathOf`, `permKeyOf`, `permissionKeys` (Task 1); `routePermissions` từ `@/config/routePermissions`
- Produces: không có export — chỉ là lưới an toàn cho mọi task sau

- [ ] **Step 1: Chụp ảnh key quyền hiện tại**

```bash
cd fe
mkdir -p src/config/__snapshots__
node -e "
const fs=require('fs');
const src=fs.readFileSync('src/config/routePermissions.ts','utf8');
const keys=[...src.matchAll(/^\s*'([^']+)':\s*'/gm)].map(m=>m[1]);
fs.writeFileSync('src/config/__snapshots__/permission-keys-truoc-doi.json',
  JSON.stringify(keys.sort(),null,2));
console.log(keys.length,'key');
"
```

Expected: in ra khoảng 80 key. File này là bằng chứng "không cấp lại quyền" — **không được sửa tay về sau**.

- [ ] **Step 2: Viết test (sẽ đỏ)**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MENU_MODULES, MENU_LEAVES, pathOf, permKeyOf, permissionKeys,
} from './menuCatalog';
import { routePermissions } from './routePermissions';
import keysTruocDoi from './__snapshots__/permission-keys-truoc-doi.json';

/** Đọc App.tsx, trả về map route đầy đủ → có phải ComingSoonPage không. */
function docRouteTuApp(): Map<string, boolean> {
  const src = fs
    .readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8')
    .split('\n');
  const stack: { indent: number; full: string }[] = [];
  const out = new Map<string, boolean>();
  for (const line of src) {
    const m = line.match(/<Route\s+path="([^"]+)"/);
    if (!m) continue;
    const indent = line.search(/\S/);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].full : '';
    const full = (parent + '/' + m[1]).replace(/\/+/g, '/');
    out.set(full, /ComingSoonPage/.test(line));
    if (!/\/>\s*$/.test(line)) stack.push({ indent, full });
  }
  return out;
}

const ROUTES = docRouteTuApp();

describe('menuCatalog ↔ App.tsx', () => {
  it('mọi mục status=ok phải có route thật, không phải ComingSoon', () => {
    const sai = MENU_LEAVES.filter((l) => l.status === 'ok').filter((l) => {
      const p = pathOf(l);
      return !ROUTES.has(p) || ROUTES.get(p) === true;
    });
    expect(sai.map((l) => l.key)).toEqual([]);
  });

  it('mọi route trong App.tsx phải được khai trong catalog', () => {
    const BO_QUA = [
      '/login', '/profile', '/*',
      '/cau-hinh/',        // trang cấu hình vào từ menu bánh răng
      '/tao-moi', '/sua',  // route con của trang biểu mẫu
      '/:',                // route có tham số
    ];
    const daKhai = new Set(MENU_LEAVES.map(pathOf));
    const thieu = [...ROUTES.keys()].filter(
      (r) => !daKhai.has(r) && !BO_QUA.some((b) => r.includes(b)),
    );
    expect(thieu).toEqual([]);
  });
});

describe('menuCatalog — toàn vẹn', () => {
  it('key không trùng nhau', () => {
    const keys = MENU_LEAVES.map((l) => l.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('mọi mục trỏ một phân hệ có thật', () => {
    const ids = new Set(MENU_MODULES.map((m) => m.id));
    const sai = MENU_LEAVES.filter((l) => !ids.has(l.module));
    expect(sai.map((l) => l.key)).toEqual([]);
  });

  it('mục mang query string bắt buộc khai permKey', () => {
    const sai = MENU_LEAVES.filter((l) => l.key.includes('?') && !l.permKey);
    expect(sai.map((l) => l.key)).toEqual([]);
  });
});

describe('phân quyền — không cấp lại', () => {
  it('key quyền sinh ra là tập con của key quyền cũ', () => {
    const cu = new Set(keysTruocDoi as string[]);
    const themMoi = permissionKeys().filter((k) => !cu.has(k));
    expect(themMoi).toEqual([]);
  });

  it('không key nào trong routePermissions bị catalog bỏ rơi', () => {
    const daKhai = new Set(MENU_LEAVES.map(permKeyOf));
    const roiRung = Object.keys(routePermissions).filter(
      (k) => !daKhai.has(k) && !k.startsWith('/cau-hinh/'),
    );
    expect(roiRung).toEqual([]);
  });
});
```

- [ ] **Step 3: Chạy test để thấy nó đỏ đúng chỗ**

Run: `cd fe && npx vitest run src/config/menuCatalog.test.ts`
Expected: FAIL. Đọc kỹ từng lỗi:
- `mọi mục status=ok phải có route thật` đỏ → có mục đánh `ok` nhưng route là ComingSoon → **sửa `status` trong catalog thành `soon`**, không sửa test.
- `mọi route trong App.tsx phải được khai` đỏ → có route sống chưa khai → thêm vào catalog dạng `legacy: true`.
- `key quyền sinh ra là tập con` đỏ → có mục `ok` mà key chưa từng có quyền → xem lại, gần như chắc chắn nó phải là `soon`.

- [ ] **Step 4: Sửa catalog cho đến khi xanh**

Chỉ sửa `menuCatalog.tsx`. **Không nới lỏng test.** Nếu tin là test sai thì dừng lại hỏi, đừng tự đổi.

Test 2 sẽ liệt kê đúng 12 route giữ chỗ đang sống trong `App.tsx` mà catalog chưa khai.
Chúng đều là route trỏ `ComingSoonPage` từ trước, không phải trang thật, nên khai
`status: 'soon'` **kèm** `legacy: true` — vừa không lọt vào sidebar, vừa không sinh key quyền:

```tsx
  // ===== Route giữ chỗ có sẵn từ trước — ComingSoon, không lên sidebar =====
  { key: '/chung-tu/phieu-nhap', label: 'Phiếu nhập', module: 'kho', status: 'soon', legacy: true },
  { key: '/chung-tu/phieu-xuat', label: 'Phiếu xuất', module: 'kho', status: 'soon', legacy: true },
  { key: '/chung-tu/phieu-luong', label: 'Phiếu lương', module: 'tien-luong', status: 'soon', legacy: true },
  { key: '/chung-tu/bang-tinh-luong', label: 'Bảng tính lương', module: 'tien-luong', status: 'soon', legacy: true },
  { key: '/chung-tu/bang-cham-cong', label: 'Bảng chấm công', module: 'tien-luong', status: 'soon', legacy: true },
  { key: '/chung-tu/cham-cong-lam-them', label: 'Bảng chấm công làm thêm giờ', module: 'tien-luong', status: 'soon', legacy: true },
  { key: '/chung-tu/phan-bo-khau-hao', label: 'Bảng phân bổ khấu hao TSCĐ', module: 'tai-san', status: 'soon', legacy: true },
  { key: '/chung-tu/phieu-ke-toan', label: 'Phiếu kế toán', module: 'tong-hop', status: 'soon', legacy: true },
  { key: '/chung-tu/de-nghi-thanh-toan', label: 'Đề nghị thanh toán', module: 'von-dong-tien', status: 'soon', legacy: true },
  { key: '/kho/kiem-ke', label: 'Kiểm kê kho', module: 'kho', status: 'soon', legacy: true },
  { key: '/trung-tam-du-lieu/nhan-su', label: 'Quản lý Nhân sự', module: 'tien-luong', status: 'soon', legacy: true },
  { key: '/trung-tam-du-lieu/luong-bhxh', label: 'Lương & BHXH', module: 'tien-luong', status: 'soon', legacy: true },
```

`/kho/kiem-ke` và `/chung-tu/phieu-ke-toan` vẫn vào được từ thanh ngang `KHO_NAV` /
`CHUNG_TU_NAV` — giữ nguyên, không đụng `sectionNavs.tsx`.

Run: `cd fe && npx vitest run src/config/menuCatalog.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/config/menuCatalog.test.ts src/config/__snapshots__ src/config/menuCatalog.tsx
git commit -m "test(menu): 4 test giữ catalog khớp route và không cấp lại quyền"
```

---

### Task 3: `useVisibleMenu` — hai tầng lọc

**Files:**
- Create: `fe/src/hooks/useVisibleMenu.ts`
- Test: `fe/src/hooks/useVisibleMenu.test.ts`

**Interfaces:**
- Consumes: `MENU_MODULES`, `MENU_LEAVES`, `leavesOfModule`, `permKeyOf`, `pathOf` (Task 1); `useEffectiveMenuKeys()` (đã có); `useAuth()` (đã có)
- Produces:
  - `type VisibleModule = { module: MenuModule; leaves: MenuLeaf[] }`
  - `useVisibleMenu(): VisibleModule[]` — 12 phân hệ đã lọc, phân hệ rỗng bị bỏ
  - `locMuc(leaves, moduleKeys, coQuyen, isSuperAdmin): MenuLeaf[]` — hàm thuần, test được không cần React

- [ ] **Step 1: Viết test (đỏ)**

```ts
import { describe, it, expect } from 'vitest';
import { locMuc } from './useVisibleMenu';
import type { MenuLeaf } from '@/config/menuCatalog';

const muc = (key: string, extra: Partial<MenuLeaf> = {}): MenuLeaf => ({
  key, label: key, module: 'kho', status: 'ok', ...extra,
});

describe('locMuc', () => {
  it('SuperAdmin thấy hết, bỏ qua cả lĩnh vực lẫn quyền', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/kho/xuat-kho')];
    expect(locMuc(ds, [], () => false, true)).toHaveLength(2);
  });

  it('ẩn mục ngoài lĩnh vực của tenant', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/thue/tong-hop')];
    const ra = locMuc(ds, ['/kho'], () => true, false);
    expect(ra.map((l) => l.key)).toEqual(['/kho/nhap-kho']);
  });

  it('ẩn mục không có quyền xem', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/kho/xuat-kho')];
    const ra = locMuc(ds, ['/kho'], (p) => p === '/kho/nhap-kho:xem', false);
    expect(ra.map((l) => l.key)).toEqual(['/kho/nhap-kho']);
  });

  it('mục mang query string xin quyền theo permKey, không theo key', () => {
    const ds = [
      muc('/trung-tam-du-lieu/ke-hoach?tab=nhan-su', {
        permKey: '/trung-tam-du-lieu/ke-hoach',
      }),
    ];
    const ra = locMuc(
      ds,
      ['/trung-tam-du-lieu/ke-hoach'],
      (p) => p === '/trung-tam-du-lieu/ke-hoach:xem',
      false,
    );
    expect(ra).toHaveLength(1);
  });

  it('mục soon vẫn hiện dù chưa ai được cấp quyền cho nó', () => {
    const ds = [muc('/kho/tinh-gia-xuat', { status: 'soon' })];
    expect(locMuc(ds, ['/kho'], () => false, false)).toHaveLength(1);
  });

  it('mục legacy không bao giờ hiện', () => {
    const ds = [muc('/bao-cao/so-cai', { legacy: true })];
    expect(locMuc(ds, ['/bao-cao'], () => true, false)).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/hooks/useVisibleMenu.test.ts`
Expected: FAIL — "Failed to resolve import './useVisibleMenu'"

- [ ] **Step 3: Viết hook**

```ts
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { keyMatches } from '@/config/modules';
import { useEffectiveMenuKeys } from './useEffectiveMenuKeys';
import {
  MENU_MODULES, leavesOfModule, permKeyOf, pathOf,
  type MenuLeaf, type MenuModule,
} from '@/config/menuCatalog';

export interface VisibleModule {
  module: MenuModule;
  leaves: MenuLeaf[];
}

/**
 * Hai tầng lọc, thứ tự cố định: lĩnh vực trước, quyền sau.
 * Mục `soon` bỏ qua tầng quyền — chưa có gì để cấp, ẩn đi thì người dùng
 * không bao giờ biết tính năng đang được làm.
 */
export function locMuc(
  leaves: MenuLeaf[],
  moduleKeys: string[],
  coQuyen: (perm: string) => boolean,
  isSuperAdmin: boolean,
): MenuLeaf[] {
  return leaves.filter((leaf) => {
    if (leaf.legacy) return false;
    if (isSuperAdmin) return true;
    if (!keyMatches(pathOf(leaf), moduleKeys)) return false;
    if (leaf.status === 'soon') return true;
    return coQuyen(`${permKeyOf(leaf)}:xem`);
  });
}

export function useVisibleMenu(): VisibleModule[] {
  const { hasPermission, user } = useAuth();
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  return useMemo(
    () =>
      MENU_MODULES.map((module) => {
        // Mục gộp (Danh mục): mở khi có quyền xem ít nhất 1 route con.
        if (module.aggregateRoutes) {
          const mo =
            isSuperAdmin ||
            module.aggregateRoutes.some((r) => hasPermission(`${r}:xem`));
          return { module, leaves: mo ? leavesOfModule(module.id) : [] };
        }
        return {
          module,
          leaves: locMuc(
            leavesOfModule(module.id),
            allEffectiveKeys,
            hasPermission,
            isSuperAdmin,
          ),
        };
      }).filter((m) => m.leaves.length > 0),
    [allEffectiveKeys, hasPermission, isSuperAdmin],
  );
}
```

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/hooks/useVisibleMenu.test.ts`
Expected: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/hooks/useVisibleMenu.ts src/hooks/useVisibleMenu.test.ts
git commit -m "feat(menu): useVisibleMenu lọc catalog theo lĩnh vực rồi theo quyền"
```

---

### Task 4: `MenuItemList` — danh sách dùng chung

**Files:**
- Create: `fe/src/components/layout/sidebar/MenuItemList.tsx`
- Test: `fe/src/components/layout/sidebar/MenuItemList.test.tsx`

**Interfaces:**
- Consumes: `MenuLeaf`, `pathOf` (Task 1)
- Produces: `<MenuItemList leaves activePath onSelect />` — component **duy nhất** vẽ danh sách mục con. Panel, flyout, drawer mobile đều bọc nó.

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItemList } from './MenuItemList';
import type { MenuLeaf } from '@/config/menuCatalog';

const leaves: MenuLeaf[] = [
  { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' },
  { key: '/kho/tinh-gia-xuat', label: 'Tính giá xuất kho', module: 'kho', status: 'soon' },
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Hàng hóa', module: 'kho', cluster: 'NHÓM HÀNG', status: 'ok' },
];

describe('MenuItemList', () => {
  it('vẽ đủ mục, kể cả mục chưa có trang', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Tính giá xuất kho')).toBeTruthy();
  });

  it('mục soon có chấm cam và class làm mờ', () => {
    const { container } = render(
      <MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />,
    );
    const nut = screen.getByText('Tính giá xuất kho').closest('button')!;
    expect(nut.className).toContain('menu-item-coming-soon');
    expect(container.querySelectorAll('.coming-soon-dot')).toHaveLength(1);
  });

  it('hiện caption cụm một lần, ngay trước mục đầu của cụm', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getAllByText('NHÓM HÀNG')).toHaveLength(1);
  });

  it('đánh dấu mục đang mở bằng aria-current', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    const nut = screen.getByText('Nhập kho').closest('button')!;
    expect(nut.getAttribute('aria-current')).toBe('page');
  });

  it('bấm mục thì gọi onSelect với key đầy đủ, giữ nguyên query string', () => {
    const onSelect = vi.fn();
    const ds: MenuLeaf[] = [
      { key: '/trung-tam-du-lieu/ke-hoach?tab=ban-hang', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch bán hàng', module: 'ban-hang', status: 'ok' },
    ];
    render(<MenuItemList leaves={ds} activePath="/" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Kế hoạch bán hàng'));
    expect(onSelect).toHaveBeenCalledWith('/trung-tam-du-lieu/ke-hoach?tab=ban-hang');
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/layout/sidebar/MenuItemList.test.tsx`
Expected: FAIL — không resolve được `./MenuItemList`

- [ ] **Step 3: Viết component**

```tsx
import React from 'react';
import { pathOf, type MenuLeaf } from '@/config/menuCatalog';

interface Props {
  leaves: MenuLeaf[];
  /** location.pathname hiện tại. */
  activePath: string;
  onSelect: (key: string) => void;
}

/**
 * Danh sách mục con của một phân hệ.
 * DÙNG CHUNG cho panel · flyout · drawer mobile — ba chỗ đó không được
 * tự vẽ lại danh sách, nếu không sẽ lệch nhau khi menu đổi.
 */
export const MenuItemList: React.FC<Props> = ({ leaves, activePath, onSelect }) => {
  let clusterDangVe: string | undefined;

  return (
    <div className="flex flex-col">
      {leaves.map((leaf) => {
        const moCluster = leaf.cluster && leaf.cluster !== clusterDangVe;
        if (leaf.cluster) clusterDangVe = leaf.cluster;
        const dangMo = pathOf(leaf) === activePath;
        const soon = leaf.status === 'soon';

        return (
          <React.Fragment key={leaf.key}>
            {moCluster && (
              <div className="px-[7px] pb-[3px] pt-[10px] text-[8.5px] font-bold tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                {leaf.cluster}
              </div>
            )}
            <button
              type="button"
              aria-current={dangMo ? 'page' : undefined}
              onClick={() => onSelect(leaf.key)}
              className={[
                'flex h-[19px] w-full items-center gap-[6px] rounded-[6px] px-[7px] py-[3.5px]',
                'text-left text-[11.5px] leading-none transition-colors',
                dangMo
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium'
                  : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
                soon ? 'menu-item-coming-soon' : '',
              ].join(' ')}
            >
              {leaf.icon && <span className="shrink-0 text-[12px]">{leaf.icon}</span>}
              <span className="flex-1 truncate">{leaf.label}</span>
              {soon && <span className="coming-soon-dot" />}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MenuItemList;
```

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/MenuItemList.test.tsx`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/components/layout/sidebar/MenuItemList.tsx src/components/layout/sidebar/MenuItemList.test.tsx
git commit -m "feat(sidebar): MenuItemList dùng chung cho panel, flyout, drawer"
```

---

### Task 5: `useSidebarState` — thu gọn, phân hệ đang mở, `⌘\`

**Files:**
- Create: `fe/src/components/layout/sidebar/useSidebarState.ts`
- Test: `fe/src/components/layout/sidebar/useSidebarState.test.ts`

**Interfaces:**
- Consumes: `MENU_MODULES`, `MENU_LEAVES`, `pathOf` (Task 1)
- Produces:
  - `moduleTheoPath(pathname): ModuleId | undefined` — hàm thuần
  - `useSidebarState(userId?): { thuGon, datThuGon, moduleDangChon, chonModule, moduleTheoUrl }`
  - Khoá localStorage: `sidebar-thu-gon:<userId ?? 'khach'>`

- [ ] **Step 1: Viết test (đỏ)**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { moduleTheoPath, useSidebarState, KHOA_THU_GON } from './useSidebarState';

describe('moduleTheoPath', () => {
  it('tìm ra phân hệ của một trang', () => {
    expect(moduleTheoPath('/kho/nhap-kho')).toBe('kho');
    expect(moduleTheoPath('/thue/tong-hop')).toBe('thue');
    expect(moduleTheoPath('/')).toBe('tong-quan');
  });

  it('trang con không khai trong menu thì quy về phân hệ của trang cha', () => {
    expect(moduleTheoPath('/kho/nhap-kho/tao-moi')).toBe('kho');
  });

  it('đường dẫn lạ hoắc trả undefined', () => {
    expect(moduleTheoPath('/khong-ton-tai')).toBeUndefined();
  });
});

describe('useSidebarState', () => {
  beforeEach(() => localStorage.clear());

  it('mặc định mở panel', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    expect(result.current.thuGon).toBe(false);
  });

  it('nhớ trạng thái thu gọn theo từng người dùng', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    act(() => result.current.datThuGon(true));
    expect(localStorage.getItem(KHOA_THU_GON('u1'))).toBe('true');

    const khac = renderHook(() => useSidebarState('u2'));
    expect(khac.result.current.thuGon).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/layout/sidebar/useSidebarState.test.ts`
Expected: FAIL — không resolve được `./useSidebarState`

- [ ] **Step 3: Viết hook**

```ts
import { useCallback, useEffect, useState } from 'react';
import { MENU_LEAVES, pathOf, type ModuleId } from '@/config/menuCatalog';

export const KHOA_THU_GON = (userId?: string) =>
  `sidebar-thu-gon:${userId ?? 'khach'}`;

/** Phân hệ chứa một pathname. Khớp dài nhất trước để '/' không nuốt hết. */
export function moduleTheoPath(pathname: string): ModuleId | undefined {
  const theoDoDai = [...MENU_LEAVES].sort(
    (a, b) => pathOf(b).length - pathOf(a).length,
  );
  const khop = theoDoDai.find((l) => {
    const p = pathOf(l);
    return p === '/' ? pathname === '/' : pathname.startsWith(p);
  });
  return khop?.module;
}

export function useSidebarState(userId?: string) {
  const [thuGon, datThuGonState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KHOA_THU_GON(userId)) === 'true';
    } catch {
      return false;
    }
  });
  const [moduleDangChon, chonModule] = useState<ModuleId | undefined>();

  const datThuGon = useCallback(
    (v: boolean) => {
      datThuGonState(v);
      try {
        localStorage.setItem(KHOA_THU_GON(userId), String(v));
      } catch {
        /* private mode — bỏ qua, chỉ mất tiện ích ghi nhớ */
      }
    },
    [userId],
  );

  // ⌘\ hoặc Ctrl+\ để mở/đóng panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        datThuGonState((v) => {
          const moi = !v;
          try {
            localStorage.setItem(KHOA_THU_GON(userId), String(moi));
          } catch { /* bỏ qua */ }
          return moi;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId]);

  return { thuGon, datThuGon, moduleDangChon, chonModule, moduleTheoUrl: moduleTheoPath };
}
```

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/useSidebarState.test.ts`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/components/layout/sidebar/useSidebarState.ts src/components/layout/sidebar/useSidebarState.test.ts
git commit -m "feat(sidebar): state thu gọn + phím tắt ⌘\\, nhớ theo người dùng"
```

---

### Task 6: `SidebarRail` — 12 ô phân hệ

**Files:**
- Create: `fe/src/components/layout/sidebar/SidebarRail.tsx`
- Test: `fe/src/components/layout/sidebar/SidebarRail.test.tsx`

**Interfaces:**
- Consumes: `VisibleModule` (Task 3)
- Produces: `<SidebarRail modules activeModule onPick onHover />`

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarRail } from './SidebarRail';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'kho', label: 'Kho', railLabel: 'Kho', icon: null },
    leaves: [
      { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' },
      { key: '/kho/xuat-kho', label: 'Xuất kho', module: 'kho', status: 'ok' },
    ],
  },
  {
    module: { id: 'thue', label: 'Thuế', railLabel: 'Thuế', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Tổng hợp', module: 'thue', status: 'ok' }],
  },
];

describe('SidebarRail', () => {
  it('vẽ một ô cho mỗi phân hệ, dùng nhãn viết tắt', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    expect(screen.getByText('Kho')).toBeTruthy();
    expect(screen.getByText('Thuế')).toBeTruthy();
  });

  it('tooltip ghi tên đầy đủ kèm số mục con', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    const o = screen.getByText('Kho').closest('button')!;
    expect(o.getAttribute('title')).toBe('Kho — 2 mục');
  });

  it('đánh dấu phân hệ đang mở', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    expect(screen.getByText('Kho').closest('button')!.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Thuế').closest('button')!.getAttribute('aria-current')).toBeNull();
  });

  it('bấm ô gọi onPick với id phân hệ', () => {
    const onPick = vi.fn();
    render(<SidebarRail modules={modules} activeModule="kho" onPick={onPick} />);
    fireEvent.click(screen.getByText('Thuế'));
    expect(onPick).toHaveBeenCalledWith('thue');
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/layout/sidebar/SidebarRail.test.tsx`
Expected: FAIL — không resolve được `./SidebarRail`

- [ ] **Step 3: Viết component**

```tsx
import React from 'react';
import type { ModuleId } from '@/config/menuCatalog';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  modules: VisibleModule[];
  activeModule?: ModuleId;
  onPick: (id: ModuleId) => void;
  onHover?: (id: ModuleId | undefined) => void;
}

/** Cột 62px bên trái. Không bao giờ cuộn — 12 ô cao 40px vừa mọi màn hình ≥ 640px. */
export const SidebarRail: React.FC<Props> = ({
  modules, activeModule, onPick, onHover,
}) => (
  <nav
    aria-label="Phân hệ"
    className="flex w-[62px] shrink-0 flex-col gap-[2px] overflow-hidden border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] px-[6px] py-[8px]"
  >
    {modules.map(({ module, leaves }) => {
      const dangMo = module.id === activeModule;
      return (
        <button
          key={module.id}
          type="button"
          title={`${module.label} — ${leaves.length} mục`}
          aria-current={dangMo ? 'true' : undefined}
          onClick={() => onPick(module.id)}
          onMouseEnter={() => onHover?.(module.id)}
          onMouseLeave={() => onHover?.(undefined)}
          className={[
            'flex h-[40px] w-[50px] flex-col items-center justify-center gap-[2px] rounded-[8px] transition-colors',
            dangMo
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
          ].join(' ')}
        >
          <span className="text-[17px] leading-none">{module.icon}</span>
          <span className="w-full truncate px-[2px] text-center text-[8.5px] leading-none">
            {module.railLabel}
          </span>
        </button>
      );
    })}
  </nav>
);

export default SidebarRail;
```

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/SidebarRail.test.tsx`
Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/components/layout/sidebar/SidebarRail.tsx src/components/layout/sidebar/SidebarRail.test.tsx
git commit -m "feat(sidebar): rail 62px, 12 phân hệ, tooltip tên đầy đủ"
```

---

### Task 7: `SidebarSearch` + `HelpMenu`

**Files:**
- Create: `fe/src/components/layout/sidebar/SidebarSearch.tsx`
- Create: `fe/src/components/layout/sidebar/HelpMenu.tsx`
- Test: `fe/src/components/layout/sidebar/SidebarSearch.test.tsx`

**Interfaces:**
- Consumes: `VisibleModule` (Task 3)
- Produces:
  - `timMuc(modules, tuKhoa): { leaf: MenuLeaf; moduleLabel: string }[]` — hàm thuần, bỏ dấu tiếng Việt, tối đa 8 kết quả
  - `<SidebarSearch modules onSelect />`
  - `<HelpMenu onSelect />` — 4 trang `/quy-trinh` `/chinh-sach` `/bieu-mau` `/huong-dan`

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect } from 'vitest';
import { timMuc } from './SidebarSearch';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'kho', label: 'Kho', railLabel: 'Kho', icon: null },
    leaves: [{ key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' }],
  },
  {
    module: { id: 'thue', label: 'Thuế', railLabel: 'Thuế', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Bảng tổng hợp thuế', module: 'thue', status: 'ok' }],
  },
];

describe('timMuc', () => {
  it('tìm không dấu vẫn ra', () => {
    expect(timMuc(modules, 'nhap kho').map((r) => r.leaf.key)).toEqual(['/kho/nhap-kho']);
  });

  it('không phân biệt hoa thường', () => {
    expect(timMuc(modules, 'THUE')).toHaveLength(1);
  });

  it('kèm tên phân hệ để biết mục nằm ở đâu', () => {
    expect(timMuc(modules, 'tổng hợp')[0].moduleLabel).toBe('Thuế');
  });

  it('từ khóa rỗng thì không trả gì', () => {
    expect(timMuc(modules, '  ')).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/layout/sidebar/SidebarSearch.test.tsx`
Expected: FAIL — không resolve được `./SidebarSearch`

- [ ] **Step 3: Viết `SidebarSearch.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import type { MenuLeaf } from '@/config/menuCatalog';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

export interface KetQuaTim {
  leaf: MenuLeaf;
  moduleLabel: string;
}

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Tìm xuyên mọi mục đang hiện. Tối đa 8 kết quả cho vừa panel. */
export function timMuc(modules: VisibleModule[], tuKhoa: string): KetQuaTim[] {
  const q = boDau(tuKhoa.trim());
  if (!q) return [];
  const ra: KetQuaTim[] = [];
  for (const { module, leaves } of modules) {
    for (const leaf of leaves) {
      if (boDau(leaf.label).includes(q) || boDau(module.label).includes(q)) {
        ra.push({ leaf, moduleLabel: module.label });
        if (ra.length === 8) return ra;
      }
    }
  }
  return ra;
}

interface Props {
  modules: VisibleModule[];
  onSelect: (key: string) => void;
}

export const SidebarSearch: React.FC<Props> = ({ modules, onSelect }) => {
  const [tuKhoa, datTuKhoa] = useState('');
  const oRef = useRef<HTMLInputElement>(null);
  const ketQua = timMuc(modules, tuKhoa);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        oRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <div className="flex h-[24px] items-center gap-[6px] rounded-[7px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-[7px]">
        <SearchOutlined className="text-[11px] text-[hsl(var(--muted-foreground))]" />
        <input
          ref={oRef}
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
          placeholder="Tìm nhanh"
          aria-label="Tìm nhanh trong menu"
          className="w-full bg-transparent text-[11px] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
        />
        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">⌘K</span>
      </div>

      {ketQua.length > 0 && (
        <div className="absolute left-0 right-0 top-[28px] z-50 rounded-[9px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-[4px] shadow-lg">
          {ketQua.map(({ leaf, moduleLabel }) => (
            <button
              key={leaf.key}
              type="button"
              onClick={() => {
                onSelect(leaf.key);
                datTuKhoa('');
              }}
              className="flex w-full flex-col items-start rounded-[6px] px-[7px] py-[3px] text-left hover:bg-[hsl(var(--muted))]"
            >
              <span className="text-[11.5px] leading-tight">{leaf.label}</span>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{moduleLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarSearch;
```

- [ ] **Step 4: Viết `HelpMenu.tsx`**

```tsx
import React from 'react';
import {
  QuestionCircleOutlined, NodeIndexOutlined,
  SafetyCertificateOutlined, FormOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';

/**
 * Bốn trang thư viện (Quy trình / Chính sách / Biểu mẫu / Hướng dẫn).
 * Không chiếm ô trên rail — rail dành cho 12 phân hệ nghiệp vụ.
 */
const MUC = [
  { key: '/quy-trinh', label: 'Quy trình', icon: <NodeIndexOutlined /> },
  { key: '/chinh-sach', label: 'Chính sách', icon: <SafetyCertificateOutlined /> },
  { key: '/bieu-mau', label: 'Biểu mẫu', icon: <FormOutlined /> },
  { key: '/huong-dan', label: 'Hướng dẫn', icon: <QuestionCircleOutlined /> },
];

export const HelpMenu: React.FC<{ onSelect: (key: string) => void }> = ({ onSelect }) => (
  <Dropdown
    placement="topLeft"
    trigger={['click']}
    menu={{ items: MUC, onClick: ({ key }) => onSelect(key) }}
  >
    <button
      type="button"
      className="flex h-[22px] w-full items-center gap-[6px] rounded-[6px] px-[7px] text-[11px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
    >
      <QuestionCircleOutlined className="text-[12px]" />
      <span>Trợ giúp &amp; phản hồi</span>
    </button>
  </Dropdown>
);

export default HelpMenu;
```

- [ ] **Step 5: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/SidebarSearch.test.tsx`
Expected: PASS, 4 test.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/components/layout/sidebar/SidebarSearch.tsx src/components/layout/sidebar/SidebarSearch.test.tsx src/components/layout/sidebar/HelpMenu.tsx
git commit -m "feat(sidebar): ô tìm ⌘K xuyên menu + Trợ giúp & phản hồi"
```

---

### Task 8: `ModulePanel` + `ModuleFlyout` + `Sidebar`

**Files:**
- Create: `fe/src/components/layout/sidebar/ModulePanel.tsx`
- Create: `fe/src/components/layout/sidebar/ModuleFlyout.tsx`
- Create: `fe/src/components/layout/sidebar/Sidebar.tsx`
- Create: `fe/src/components/layout/sidebar/index.ts`
- Test: `fe/src/components/layout/sidebar/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `MenuItemList` (Task 4), `useSidebarState` (Task 5), `SidebarRail` (Task 6), `SidebarSearch`/`HelpMenu` (Task 7), `useVisibleMenu` (Task 3)
- Produces: `<Sidebar />` — không nhận prop, tự lấy quyền/lĩnh vực/route. `index.ts` re-export `Sidebar`, `MobileMenu`.

- [ ] **Step 1: Viết `ModulePanel.tsx`**

```tsx
import React from 'react';
import { MenuFoldOutlined } from '@ant-design/icons';
import { MenuItemList } from './MenuItemList';
import { SidebarSearch } from './SidebarSearch';
import { HelpMenu } from './HelpMenu';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  current: VisibleModule;
  allModules: VisibleModule[];
  activePath: string;
  onSelect: (key: string) => void;
  onCollapse?: () => void;
}

/**
 * Cột 196px cạnh rail. KHÔNG liệt kê lại 12 phân hệ — rail đã hiện đủ ngay cạnh.
 * Chỗ trống giữa danh sách và đáy là nơi thẻ "Kỳ kế toán" sẽ vào (hoãn — thiếu API).
 */
export const ModulePanel: React.FC<Props> = ({
  current, allModules, activePath, onSelect, onCollapse,
}) => (
  <div className="flex w-[196px] shrink-0 flex-col gap-[8px] border-r border-[hsl(var(--border))] bg-[hsl(var(--sidebar-panel))] px-[8px] py-[10px]">
    <div className="flex items-center justify-between">
      <span className="text-[15px] font-bold leading-none">{current.module.label}</span>
      {onCollapse && (
        <button
          type="button"
          aria-label="Thu gọn menu"
          onClick={onCollapse}
          className="rounded-[6px] p-[3px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <MenuFoldOutlined className="text-[12px]" />
        </button>
      )}
    </div>

    <SidebarSearch modules={allModules} onSelect={onSelect} />

    <MenuItemList leaves={current.leaves} activePath={activePath} onSelect={onSelect} />

    {/* Thẻ "Kỳ kế toán" sẽ nằm ở đây khi có API — spec §14.2 */}
    <div className="flex-1" />

    <HelpMenu onSelect={onSelect} />
  </div>
);

export default ModulePanel;
```

- [ ] **Step 2: Viết `ModuleFlyout.tsx`**

```tsx
import React from 'react';
import { MenuItemList } from './MenuItemList';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  current: VisibleModule;
  activePath: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/**
 * Popover nổi cạnh rail khi panel đang thu gọn.
 * Dùng ĐÚNG MenuItemList của panel — cùng danh sách, cùng caption cụm,
 * cùng cách đánh dấu mục sắp có.
 */
export const ModuleFlyout: React.FC<Props> = ({
  current, activePath, onSelect, onClose,
}) => (
  <div
    role="dialog"
    aria-label={current.module.label}
    onMouseLeave={onClose}
    className="absolute left-[62px] top-0 z-[120] w-[196px] rounded-r-[9px] border border-[hsl(var(--border))] bg-[hsl(var(--sidebar-panel))] px-[8px] py-[10px] shadow-lg"
  >
    <div className="mb-[6px] text-[15px] font-bold leading-none">
      {current.module.label}
    </div>
    <MenuItemList
      leaves={current.leaves}
      activePath={activePath}
      onSelect={(key) => {
        onSelect(key);
        onClose();
      }}
    />
  </div>
);

export default ModuleFlyout;
```

- [ ] **Step 3: Viết `Sidebar.tsx`**

```tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleMenu } from '@/hooks/useVisibleMenu';
import type { ModuleId } from '@/config/menuCatalog';
import { SidebarRail } from './SidebarRail';
import { ModulePanel } from './ModulePanel';
import { ModuleFlyout } from './ModuleFlyout';
import { useSidebarState } from './useSidebarState';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const modules = useVisibleMenu();
  const { thuGon, datThuGon, moduleTheoUrl } = useSidebarState(user?.id);

  const moduleTheoTrang = moduleTheoUrl(pathname);
  const [moduleChon, datModuleChon] = useState<ModuleId | undefined>();
  const [flyout, datFlyout] = useState<ModuleId | undefined>();

  const dangMo = moduleChon ?? moduleTheoTrang ?? modules[0]?.module.id;
  const current = modules.find((m) => m.module.id === dangMo);
  const flyoutModule = modules.find((m) => m.module.id === flyout);

  const chonModule = (id: ModuleId) => {
    const m = modules.find((x) => x.module.id === id);
    if (!m) return;
    // Nhóm 1 mục (Tổng quan, Danh mục) → vào thẳng trang, không mở panel.
    if (m.module.route) {
      navigate(m.module.route);
      datModuleChon(id);
      return;
    }
    // Bấm lại icon đang chọn → đóng/mở panel.
    if (id === dangMo && !thuGon) datThuGon(true);
    else datThuGon(false);
    datModuleChon(id);
  };

  return (
    <aside
      className="relative flex h-screen shrink-0"
      style={{ width: thuGon ? 62 : 258 }}
    >
      <SidebarRail
        modules={modules}
        activeModule={dangMo}
        onPick={chonModule}
        onHover={thuGon ? datFlyout : undefined}
      />
      {!thuGon && current && (
        <ModulePanel
          current={current}
          allModules={modules}
          activePath={pathname}
          onSelect={navigate}
          onCollapse={() => datThuGon(true)}
        />
      )}
      {thuGon && flyoutModule && !flyoutModule.module.route && (
        <ModuleFlyout
          current={flyoutModule}
          activePath={pathname}
          onSelect={navigate}
          onClose={() => datFlyout(undefined)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
```

- [ ] **Step 4: Viết `index.ts`**

```ts
export { Sidebar } from './Sidebar';
export { MobileMenu } from './MobileMenu';
export { MenuItemList } from './MenuItemList';
```

`MobileMenu` chưa có ở bước này — tạm bỏ dòng đó, thêm lại ở Task 9.

- [ ] **Step 5: Viết test khói cho `Sidebar`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

describe('Sidebar', () => {
  it('rail hiện 12 phân hệ với SuperAdmin', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(12);
  });

  it('panel mở đúng phân hệ của trang đang xem', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Xuất kho')).toBeTruthy();
  });

  it('bấm lại phân hệ đang mở thì thu gọn panel', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });
});
```

- [ ] **Step 6: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/`
Expected: PASS toàn bộ file trong thư mục.

- [ ] **Step 7: Commit**

```bash
cd fe
git add src/components/layout/sidebar/
git commit -m "feat(sidebar): ghép rail + panel + flyout thành Sidebar"
```

---

### Task 9: `MobileMenu` — drawer 2 lớp

**Files:**
- Create: `fe/src/components/layout/sidebar/MobileMenu.tsx`
- Modify: `fe/src/components/layout/sidebar/index.ts`
- Test: `fe/src/components/layout/sidebar/MobileMenu.test.tsx`

**Interfaces:**
- Consumes: `MenuItemList` (Task 4), `useVisibleMenu` (Task 3)
- Produces: `<MobileMenu open onClose />`

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

describe('MobileMenu', () => {
  it('lớp 1 liệt kê phân hệ, chưa hiện mục con', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Kho')).toBeTruthy();
    expect(screen.queryByText('Nhập kho')).toBeNull();
  });

  it('chọn phân hệ thì trượt sang lớp 2, dùng đúng danh sách của panel', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Kho'));
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('NHÓM HÀNG')).toBeTruthy();
  });

  it('nút quay lại đưa về lớp 1', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Kho'));
    fireEvent.click(screen.getByLabelText('Quay lại danh sách phân hệ'));
    expect(screen.queryByText('Nhập kho')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/layout/sidebar/MobileMenu.test.tsx`
Expected: FAIL — không resolve được `./MobileMenu`

- [ ] **Step 3: Viết component**

```tsx
import React, { useState } from 'react';
import { Drawer } from 'antd';
import { ArrowLeftOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVisibleMenu } from '@/hooks/useVisibleMenu';
import type { ModuleId } from '@/config/menuCatalog';
import { MenuItemList } from './MenuItemList';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Drawer 2 lớp: phân hệ → mục con. Lớp 2 dùng chung MenuItemList với panel. */
export const MobileMenu: React.FC<Props> = ({ open, onClose }) => {
  const modules = useVisibleMenu();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dangXem, datDangXem] = useState<ModuleId | undefined>();
  const current = modules.find((m) => m.module.id === dangXem);

  const dong = () => {
    datDangXem(undefined);
    onClose();
  };

  return (
    <Drawer
      placement="left"
      width={300}
      open={open}
      onClose={dong}
      title={current ? current.module.label : 'Menu'}
      styles={{ body: { padding: 8 } }}
    >
      {current ? (
        <>
          <button
            type="button"
            aria-label="Quay lại danh sách phân hệ"
            onClick={() => datDangXem(undefined)}
            className="mb-[8px] flex items-center gap-[6px] text-[11.5px] text-[hsl(var(--muted-foreground))]"
          >
            <ArrowLeftOutlined /> Tất cả phân hệ
          </button>
          <MenuItemList
            leaves={current.leaves}
            activePath={pathname}
            onSelect={(key) => {
              navigate(key);
              dong();
            }}
          />
        </>
      ) : (
        <div className="flex flex-col">
          {modules.map(({ module, leaves }) => (
            <button
              key={module.id}
              type="button"
              onClick={() => {
                if (module.route) {
                  navigate(module.route);
                  dong();
                } else {
                  datDangXem(module.id);
                }
              }}
              className="flex h-[36px] items-center gap-[8px] rounded-[7px] px-[8px] text-[12.5px] hover:bg-[hsl(var(--muted))]"
            >
              <span className="text-[15px]">{module.icon}</span>
              <span className="flex-1 text-left">{module.label}</span>
              {!module.route && (
                <>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {leaves.length}
                  </span>
                  <RightOutlined className="text-[9px] text-[hsl(var(--muted-foreground))]" />
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default MobileMenu;
```

- [ ] **Step 4: Thêm lại export**

```ts
// src/components/layout/sidebar/index.ts
export { Sidebar } from './Sidebar';
export { MobileMenu } from './MobileMenu';
export { MenuItemList } from './MenuItemList';
```

- [ ] **Step 5: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/sidebar/MobileMenu.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/components/layout/sidebar/MobileMenu.tsx src/components/layout/sidebar/MobileMenu.test.tsx src/components/layout/sidebar/index.ts
git commit -m "feat(sidebar): drawer mobile 2 lớp dùng chung danh sách với panel"
```

---

### Task 10: Route ComingSoon cho mục `soon` + `ComingSoon` lấy tiêu đề từ catalog

**Files:**
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/pages/ComingSoon.tsx:10-64` (xoá `pathTitles`)
- Test: `fe/src/config/menuCatalog.test.ts` (test có sẵn Task 2 sẽ bắt chỗ thiếu)

**Interfaces:**
- Consumes: `labelByPath` (Task 1)
- Produces: mọi `key` trong catalog đều navigate được, không bao giờ rơi vào `NotFound`

- [ ] **Step 1: Thêm test bắt route thiếu**

Thêm vào `menuCatalog.test.ts`:

```ts
it('mọi mục soon phải có route, dù chỉ là ComingSoon', () => {
  const thieu = MENU_LEAVES.filter(
    (l) => l.status === 'soon' && !ROUTES.has(pathOf(l)),
  );
  expect(thieu.map((l) => l.key)).toEqual([]);
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/config/menuCatalog.test.ts`
Expected: FAIL, liệt kê các key chưa có route — `/tong-hop/quyet-toan-tam-ung`, `/bao-cao/tai-chinh/thuyet-minh`, cả nhóm `/mua-hang/*`, `/ban-hang/*`, `/tien-luong/*`, `/tai-san/*`, `/ccdc/*`, `/kho/tinh-gia-xuat`, `/kho/tong-hop-xuat`, `/kho/nhap-xuat-ton`.

- [ ] **Step 3: Thêm route vào `App.tsx`**

Đặt trong `<Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>`, ngay **trước** `<Route path="*" element={<NotFound />} />`. Không bọc `ProtectedRoute` — mục `soon` chưa có quyền để cấp:

```tsx
{/* Mục đã lên sidebar nhưng chưa có màn hình — ra thẳng trang "đang phát triển".
    Danh sách sinh từ menuCatalog; thêm mục soon mới thì thêm một dòng ở đây. */}
<Route path="tong-hop/quyet-toan-tam-ung" element={<ComingSoonPage />} />
<Route path="bao-cao/tai-chinh/thuyet-minh" element={<ComingSoonPage />} />
<Route path="mua-hang">
  <Route path="ke-hoach" element={<ComingSoonPage />} />
  <Route path="du-bao" element={<ComingSoonPage />} />
  <Route path="hop-dong" element={<ComingSoonPage />} />
  <Route path="mua-hang" element={<ComingSoonPage />} />
  <Route path="so-chi-tiet" element={<ComingSoonPage />} />
  <Route path="tong-hop" element={<ComingSoonPage />} />
  <Route path="bao-cao" element={<ComingSoonPage />} />
</Route>
<Route path="ban-hang">
  <Route path="don-hang" element={<ComingSoonPage />} />
  <Route path="so-chi-tiet" element={<ComingSoonPage />} />
  <Route path="tong-hop" element={<ComingSoonPage />} />
  <Route path="nhac-no" element={<ComingSoonPage />} />
</Route>
<Route path="tien-luong">
  <Route path="tinh-luong" element={<ComingSoonPage />} />
  <Route path="so-chi-tiet" element={<ComingSoonPage />} />
  <Route path="bhxh" element={<ComingSoonPage />} />
  <Route path="cong-no" element={<ComingSoonPage />} />
  <Route path="bao-cao" element={<ComingSoonPage />} />
</Route>
<Route path="tai-san">
  <Route path="danh-muc" element={<ComingSoonPage />} />
  <Route path="khau-hao" element={<ComingSoonPage />} />
  <Route path="dieu-chuyen" element={<ComingSoonPage />} />
  <Route path="ghi-giam" element={<ComingSoonPage />} />
</Route>
<Route path="ccdc">
  <Route path="phan-bo" element={<ComingSoonPage />} />
  <Route path="dieu-chuyen" element={<ComingSoonPage />} />
  <Route path="danh-muc" element={<ComingSoonPage />} />
</Route>
```

Ba mục kho (`tinh-gia-xuat`, `tong-hop-xuat`, `nhap-xuat-ton`) thêm vào khối `<Route path="kho">` đã có.

- [ ] **Step 4: Rút gọn `ComingSoon.tsx`**

Xoá toàn bộ hằng `pathTitles` (dòng 10–64) và đổi dòng lấy tiêu đề:

```tsx
import { labelByPath } from '@/config/menuCatalog';

// ...
const title = labelByPath(location.pathname) ?? 'Tính năng';
```

Giữ nguyên mọi thứ khác — câu "Tính năng này đang được phát triển và sẽ sớm ra mắt!", biểu tượng tên lửa, pill "Sắp ra mắt", hai nút.

- [ ] **Step 5: Chạy test**

Run: `cd fe && npx vitest run src/config/menuCatalog.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/App.tsx src/pages/ComingSoon.tsx src/config/menuCatalog.test.ts
git commit -m "feat(menu): mục chưa có trang ra ComingSoon, tiêu đề lấy từ catalog"
```

---

### Task 11: `KeHoachTabsPage` đọc `?tab=`

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx:53`
- Test: `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams` từ `react-router-dom`
- Produces: `/trung-tam-du-lieu/ke-hoach?tab=nhan-su` mở thẳng tab Nhân sự

Tab hợp lệ: `ban-hang` · `nhan-su` · `kqkd` · `dong-tien` · `tai-san` · `nguon-von` · `chi-tiet`.

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect } from 'vitest';
import { tabBanDau } from './KeHoachTabsPage';

describe('tabBanDau', () => {
  it('không có ?tab thì mở Bán hàng như cũ', () => {
    expect(tabBanDau(null)).toBe('ban-hang');
  });

  it('mở đúng tab được yêu cầu', () => {
    expect(tabBanDau('nhan-su')).toBe('nhan-su');
    expect(tabBanDau('dong-tien')).toBe('dong-tien');
  });

  it('tab lạ thì rơi về Bán hàng, không vỡ trang', () => {
    expect(tabBanDau('khong-co-tab-nay')).toBe('ban-hang');
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/KeHoachTabsPage.test.tsx`
Expected: FAIL — `tabBanDau` chưa được export

- [ ] **Step 3: Sửa 3 chỗ trong `KeHoachTabsPage.tsx`**

Thêm import:

```tsx
import { useSearchParams } from "react-router-dom";
```

Thêm hàm thuần ngay trên component:

```tsx
const TAB_HOP_LE = [
  "ban-hang", "nhan-su", "kqkd", "dong-tien", "tai-san", "nguon-von", "chi-tiet",
] as const;

/** Tab mở đầu, lấy từ ?tab= trên URL. Tab lạ thì về mặc định cũ. */
export const tabBanDau = (tab: string | null): string =>
  tab && (TAB_HOP_LE as readonly string[]).includes(tab) ? tab : "ban-hang";
```

Đổi dòng 53:

```tsx
// trước: const [activeTab, setActiveTab] = useState("ban-hang");
const [searchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(() => tabBanDau(searchParams.get("tab")));
```

**Không** đụng gì khác trong file — mọi logic tính toán, gọi API, render tab giữ nguyên.

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/KeHoachTabsPage.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx src/pages/ke-hoach/tabs/KeHoachTabsPage.test.tsx
git commit -m "feat(ke-hoach): mở đúng tab theo ?tab= trên URL"
```

---

### Task 12: Nối `Sidebar` vào `MainLayout`, xoá menu hard-code

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx` (xoá ~600 dòng)
- Modify: `fe/src/index.css` (xoá CSS đè `.ant-menu-*` của sidebar)

**Interfaces:**
- Consumes: `Sidebar`, `MobileMenu` (Task 8, 9)
- Produces: `MainLayout` chỉ còn bố cục + header; không còn biết gì về nội dung menu

- [ ] **Step 1: Xoá phần thừa trong `MainLayout.tsx`**

Xoá hẳn: `AGGREGATE_MENU_ROUTES` · `menuKeyVisible` · `filterByModule` · `existingRoutes` · `createLabel` · `getItem` · `getMenuItem` · `MENU_TERM_KEYS` · `relabelMenu` · `dieuHanhMenuItems` · `keToAnMenuItems` · `thuVienMenuItems` · `filterMenuItems` · `canAccessRoute` · `byRole` · `filteredDieuHanhMenu` · `filteredThuVienMenu` · `moduleSections` · `showModuleSectionTitle` · `getSelectedKeys` · `getOpenKeys` · `handleMenuClick` · `siderWidth` · cả `MobileDrawer` nội bộ · khối `<Sider>`.

Xoá import không còn dùng: `Layout.Sider`, `Menu`, `Drawer`, `MenuProps`, `keyMatches`, `DANH_MUC_ROUTES`, `THUE_NAV`, `useEffectiveMenuKeys`, `useTerm`, và mọi icon chỉ dùng cho menu.

**Giữ nguyên**: `Header` và toàn bộ nội dung của nó (`AppSwitcher`, `TenantSwitcher`, dropdown bánh răng `settingsMenuItems`, dropdown user `userMenuItems`), `Content`, `isFormScreen`, hiệu ứng dark mode, logic PWA.

- [ ] **Step 2: Thay phần sidebar**

```tsx
import { Sidebar, MobileMenu } from './sidebar';

// trong return:
<Layout className="min-h-screen">
  {isMobile ? (
    <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
  ) : (
    <div className="fixed left-0 top-0 z-[100] h-screen">
      <Sidebar />
    </div>
  )}

  <Layout
    style={{
      marginLeft: isMobile ? 0 : 'var(--sidebar-w, 258px)',
      transition: 'margin-left 0.2s ease',
      minHeight: '100vh',
    }}
  >
    {/* Header và Content giữ nguyên y như cũ */}
  </Layout>
</Layout>
```

`MainLayout` không được tự đoán bề rộng sidebar — trạng thái thu gọn nằm trong
`Sidebar`. Cho `Sidebar` công bố bề rộng ra biến CSS, `MainLayout` chỉ đọc.
Trong `Sidebar.tsx`, thêm effect ngay trước `return`:

```tsx
  const beRong = thuGon ? 62 : 258;
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${beRong}px`);
  }, [beRong]);
```

và đổi thẻ bọc thành `<aside className="relative flex h-screen shrink-0" style={{ width: beRong }}>`.
Nhớ thêm `useEffect` vào dòng import React.

- [ ] **Step 3: Xoá CSS sidebar cũ**

```bash
cd fe
grep -n "ant-menu\|sidebar-section\|sidebar-menu\|sidebar-scroll\|sidebar-collapsed" src/index.css
```

Xoá các khối chỉ phục vụ sidebar antd cũ. **Giữ lại** `.menu-item-coming-soon`, `.menu-coming-soon`, `.coming-soon-dot` — `MenuItemList` và `SectionNav` vẫn dùng.

- [ ] **Step 4: Chạy toàn bộ kiểm tra**

```bash
cd fe
npm test
npm run lint
npm run build
npx tsc --noEmit 2>&1 | wc -l
```

Expected: test xanh · lint không thêm lỗi mới · build thành công · số dòng `tsc` **không lớn hơn** baseline đo trước khi bắt đầu đợt A.

- [ ] **Step 5: Nghiệm thu bằng mắt**

```bash
cd fe && npm run dev
```

Mở `http://localhost:8080` và kiểm 8 điểm:
1. Rail hiện các phân hệ, mỗi ô có icon + nhãn, không cuộn.
2. Panel mở đúng phân hệ của trang đang xem.
3. Bấm lại icon đang chọn → panel thu lại còn 62px, nội dung giãn ra.
4. Khi thu gọn, rê chuột vào icon → flyout hiện đúng danh sách như panel.
5. Mục mờ + chấm cam bấm được, ra trang "Tính năng này đang được phát triển và sẽ sớm ra mắt!" với đúng tên mục.
6. `⌘K` nhảy vào ô tìm; gõ "nhap kho" (không dấu) ra kết quả.
7. `⌘\` đóng/mở panel; tải lại trang vẫn nhớ trạng thái.
8. Thu nhỏ cửa sổ < 768px → drawer 2 lớp chạy đúng.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/components/layout/MainLayout.tsx src/components/layout/sidebar/Sidebar.tsx src/index.css
git commit -m "refactor(layout): MainLayout dùng Sidebar mới, bỏ menu hard-code"
```

---

## Nghiệm thu cả đợt A

- [ ] `npm test` xanh
- [ ] `npm run lint` không thêm lỗi mới so với baseline
- [ ] `npm run build` thành công
- [ ] `npx tsc --noEmit` số lỗi ≤ baseline
- [ ] Không trang nào đang chạy thật bị mất lối vào (đối chiếu `MENU_LEAVES` `status: 'ok'` với sidebar cũ)
- [ ] `git diff --stat master` cho thấy **không** file nào trong `src/services/` bị đổi (bằng chứng "không đụng logic")

**Chưa deploy sau đợt A** — chờ đợt B đổi token xong rồi deploy một lần cho người dùng khỏi thấy hai lần giao diện lạ. Khi deploy: theo memory "Deploy FE nguyên tử" (stage rồi `mv`, `index.html` sau cùng), verify tại `ketoan.masterceo.com.vn`.
