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
import { DANH_MUC_GROUPS, DANH_MUC_ROUTES } from './danhMucCatalog';

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
  /** Giữ route, KHÔNG hiện trên sidebar. Quyền cũ (nếu có) vẫn nguyên hiệu lực. */
  legacy?: true;
  /**
   * Route có thật nhưng KHÔNG có khoá quyền riêng — ví dụ trang chuyển hướng
   * `/thue` chỉ đẩy sang trang thuế đầu tiên user xem được. Quyền đã nằm ở các
   * route con. Đánh cờ này để `permissionKeys()` không sinh khoá mới.
   */
  khongCoQuyenRieng?: true;
  /**
   * Trang CHƯA có (`status: 'soon'`) nhưng khoá quyền của nó ĐÃ được cấp cho
   * vai trò từ trước — nó có mặt trong ma trận Phân quyền hiện hành.
   *
   * Trang Phân quyền lưu bằng cách ghi đè TOÀN BỘ danh sách quyền của vai trò
   * (`convertMatrixToPermissions` dựng lại từ đúng các lá của ma trận), nên
   * khoá nào rơi khỏi ma trận là bị xoá khỏi mọi vai trò ngay lần lưu kế tiếp.
   * Cờ này giữ chúng ở lại.
   *
   * KHÔNG ảnh hưởng `permissionKeys()` / `routePermissions`: hai chỗ đó vẫn chỉ
   * nhận mục `ok`, đúng như trước.
   */
  quyenDaCap?: true;
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
  { key: '/phan-tich/ban-hang', label: 'Bán hàng', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <ShoppingCartOutlined /> },
  { key: '/phan-tich/mua-hang', label: 'Mua hàng', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <ShoppingOutlined /> },
  { key: '/phan-tich/cong-no', label: 'Công nợ', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <ReconciliationOutlined /> },
  { key: '/phan-tich/dong-tien', label: 'Dòng tiền', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <DollarOutlined /> },
  { key: '/phan-tich/ton-kho', label: 'Tồn kho', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <InboxOutlined /> },
  { key: '/phan-tich/bao-cao-tai-chinh', label: 'P&L', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <PieChartOutlined /> },
  { key: '/bao-cao/pnl-khong-khau-hao', label: 'P&L không khấu hao', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/pnl-3-lop', label: 'P&L so sánh KH-DB-TH', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <StockOutlined /> },

  // ===== 3. Tổng hợp (9 ở đợt A — cụm BCTC còn 1 mục, đợt C tách thành 4) =====
  { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'ok', icon: <AccountBookOutlined /> },
  { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'soon', quyenDaCap: true, icon: <FileSearchOutlined /> },
  { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh', module: 'tong-hop', cluster: 'SỔ SÁCH & TỔNG HỢP', status: 'soon', quyenDaCap: true, icon: <ProfileOutlined /> },
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
  { key: '/trung-tam-du-lieu/tai-san', label: 'Tài sản', module: 'tai-san', status: 'soon', quyenDaCap: true, icon: <CarOutlined /> },
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

  // ===== Route index tự-điều-hướng — không phải trang riêng, không cần quyền riêng =====
  // App.tsx: <Route path="thue"><Route index element={<ThueIndexRoute />} />...
  // ThueIndexRoute bare (không ProtectedRoute) — tự chuyển sang trang con đầu
  // tiên user có quyền xem. Không sinh khóa quyền của riêng nó.
  { key: '/thue', label: 'Thuế', module: 'thue', status: 'ok', legacy: true, khongCoQuyenRieng: true },
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

/** Mọi khóa quyền sinh từ catalog (mục soon không sinh — chưa có gì để cấp).
 *  Loại ĐÚNG route của phân hệ gộp (vd '/danh-muc'): riêng nó chưa bao giờ là
 *  một khóa quyền — quyền của nó suy từ các route con trong aggregateRoutes.
 *  KHÔNG loại cả phân hệ: '/quy-trinh', '/chinh-sach', '/bieu-mau',
 *  '/huong-dan' cũng mang module 'danh-muc' nhưng CÓ khóa quyền thật trong
 *  routePermissions — loại chúng là xoá quyền đang sống khỏi ma trận. */
const ROUTE_GOP = new Set(
  MENU_MODULES.filter((m) => m.aggregateRoutes && m.route).map((m) => m.route as string),
);

/**
 * Mục có khoá quyền RIÊNG. Đúng hai điều kiện loại trừ của `permissionKeys()`,
 * tách ra để ma trận Phân quyền dùng lại y hệt — hai nơi lệch nhau là sinh
 * khoá lạ hoặc đánh rơi khoá đang sống.
 */
export const coKhoaQuyenRieng = (l: MenuLeaf): boolean =>
  !ROUTE_GOP.has(l.key) && !l.khongCoQuyenRieng;

export const permissionKeys = (): string[] =>
  Array.from(
    new Set(
      MENU_LEAVES
        .filter((l) => l.status === 'ok' && coKhoaQuyenRieng(l))
        .map(permKeyOf),
    ),
  );

// ===== Tương thích ngược — useEffectiveMenuKeys và trang Danh mục đang dùng =====
export interface MenuCatalogEntry {
  key: string;
  label: string;
  parentLabel?: string;
}

/**
 * Khử trùng theo `key`, GIỮ BẢN ĐẦU TIÊN. Bắt buộc: MENU_CATALOG quy mọi mục
 * về `pathOf`, nên 8 mục mang `?tab=` (Kế hoạch/Dự báo của 4 phân hệ) cộng 2
 * mục legacy cùng tên dồn về đúng 2 path. Để nguyên thì trang Lĩnh vực dựng
 * <Tree> với key trùng (antd báo lỗi, trạng thái tick không xác định) và lưu
 * cùng một key nhiều lần xuống `menuKeys` trong MongoDB.
 *
 * Giữ bản ĐẦU TIÊN để `parentLabel` là phân hệ đầu tiên khai mục đó —
 * '/trung-tam-du-lieu/ke-hoach' về 'Vốn & dòng tiền', đúng thứ tự khai báo.
 */
const khuTrungTheoKey = (ds: MenuCatalogEntry[]): MenuCatalogEntry[] => {
  const daCo = new Set<string>();
  return ds.filter((e) => (daCo.has(e.key) ? false : (daCo.add(e.key), true)));
};

/**
 * PHẢI gồm cả 26 route danh mục con: `DanhMucIndexPage` lọc link bằng
 * `keyMatches(path, allEffectiveKeys)`, mà `allEffectiveKeys` lấy `unassignedKeys`
 * từ đây. Thiếu chúng thì link danh mục chưa gán lĩnh vực biến mất khỏi trang Danh mục.
 */
export const MENU_CATALOG: MenuCatalogEntry[] = khuTrungTheoKey([
  ...MENU_LEAVES.map((l) => ({
    key: pathOf(l),
    label: l.label,
    parentLabel: MENU_MODULES.find((m) => m.id === l.module)?.label,
  })),
  ...DANH_MUC_GROUPS.flatMap((g) =>
    g.links.map((l) => ({
      key: l.path,
      label: l.label,
      parentLabel: `Danh mục › ${g.title}`,
    })),
  ),
]);

export const flattenMenuKeys = (
  entries: MenuCatalogEntry[] = MENU_CATALOG,
): string[] => entries.map((e) => e.key);
