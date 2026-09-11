import React from 'react';
import {
  DashboardOutlined, LineChartOutlined, BookOutlined, DollarOutlined,
  ShoppingOutlined, ShoppingCartOutlined, TeamOutlined, InboxOutlined,
  CarOutlined, ToolOutlined, CalculatorOutlined, DatabaseOutlined,
  PieChartOutlined, RiseOutlined, StockOutlined, ReconciliationOutlined,
  AccountBookOutlined, FileSearchOutlined, ProfileOutlined, TableOutlined,
  AuditOutlined, SwapOutlined, ScheduleOutlined, CreditCardOutlined,
  WalletOutlined, FileProtectOutlined, FileTextOutlined, BarChartOutlined,
  FileAddOutlined,
  FileDoneOutlined, SafetyCertificateOutlined, FundOutlined,
  NodeIndexOutlined, QuestionCircleOutlined, FormOutlined, FolderOpenOutlined,
  PayCircleOutlined, LockOutlined, InteractionOutlined, BankOutlined,
  GoldOutlined, CheckSquareOutlined, PercentageOutlined, CalendarOutlined,
  SolutionOutlined, FileSyncOutlined,
} from '@ant-design/icons';
import { DANH_MUC_GROUPS, DANH_MUC_ROUTES } from './danhMucCatalog';

/**
 * Thứ tự + nội dung bám ĐÚNG sheet "Menu tài chính" của
 * `docs/THIẾT KẾ_KẾ TOÁN.xlsx` (cột A = phân hệ, cột B = mục con). Riêng
 * "Báo cáo tài chính" tuy nằm cột A nhưng sheet "TỔNG HỢP" xếp nó là một mục
 * CỦA Tổng hợp → là cụm cuối trong phân hệ Tổng hợp, không lên rail.
 */
export type ModuleId =
  | 'tong-quan' | 'phan-tich' | 'tong-hop' | 'von-dong-tien'
  | 'mua-hang' | 'ban-hang' | 'tien-luong' | 'kho'
  | 'tai-san' | 'ccdc' | 'thue'
  | 'yc-thanh-toan' | 'yc-xuat-hoa-don' | 'thu-vien' | 'danh-muc';

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
  /**
   * Thư viện tài liệu RIÊNG của một phân hệ (Quy trình / Hướng dẫn — sheet
   * thiết kế ghi "Dạng tải file lên"). Category lưu ở BE = route bỏ '/' đầu,
   * nên quyền BE tự suy đúng khoá `<route>:<action>` (DocPermService).
   */
  thuVien?: true;
}

export const MENU_MODULES: MenuModule[] = [
  { id: 'tong-quan',       label: 'Tổng quan',                 railLabel: 'Tổng quan',  icon: <DashboardOutlined />, route: '/' },
  { id: 'phan-tich',       label: 'Phân tích',                 railLabel: 'Phân tích',  icon: <LineChartOutlined /> },
  { id: 'tong-hop',        label: 'Tổng hợp',                  railLabel: 'Tổng hợp',   icon: <BookOutlined /> },
  { id: 'von-dong-tien',   label: 'Vốn & dòng tiền',           railLabel: 'Dòng tiền',  icon: <DollarOutlined /> },
  { id: 'mua-hang',        label: 'Mua hàng',                  railLabel: 'Mua hàng',   icon: <ShoppingOutlined /> },
  { id: 'ban-hang',        label: 'Bán hàng',                  railLabel: 'Bán hàng',   icon: <ShoppingCartOutlined /> },
  { id: 'tien-luong',      label: 'Tiền lương',                railLabel: 'Tiền lương', icon: <TeamOutlined /> },
  { id: 'kho',             label: 'Kho',                       railLabel: 'Kho',        icon: <InboxOutlined /> },
  { id: 'tai-san',         label: 'Tài sản',                   railLabel: 'Tài sản',    icon: <CarOutlined /> },
  { id: 'ccdc',            label: 'Công cụ dụng cụ',           railLabel: 'CCDC',       icon: <ToolOutlined /> },
  { id: 'thue',            label: 'Thuế',                      railLabel: 'Thuế',       icon: <CalculatorOutlined /> },
  { id: 'yc-thanh-toan',   label: 'Cổng yêu cầu thanh toán',   railLabel: 'YC T.toán',  icon: <PayCircleOutlined />, route: '/cong-yeu-cau/thanh-toan' },
  { id: 'yc-xuat-hoa-don', label: 'Cổng yêu cầu xuất hóa đơn', railLabel: 'YC H.đơn',   icon: <FileSyncOutlined />, route: '/cong-yeu-cau/xuat-hoa-don' },
  { id: 'thu-vien',        label: 'Thư viện',                  railLabel: 'Thư viện',   icon: <FolderOpenOutlined /> },
  { id: 'danh-muc',        label: 'Danh mục',                  railLabel: 'Danh mục',   icon: <DatabaseOutlined />, route: '/danh-muc', aggregateRoutes: DANH_MUC_ROUTES },
];

/**
 * Hai mục mở đầu 9 phân hệ nghiệp vụ — sheet thiết kế ghi "Dạng tải file lên".
 * Mỗi phân hệ một thư viện RIÊNG (không dùng chung Thư viện › Quy trình), mỗi
 * mục một khoá quyền riêng `<gốc>/quy-trinh`, `<gốc>/huong-dan`.
 */
const thuVienCua = (module: ModuleId, goc: string): MenuLeaf[] => [
  { key: `${goc}/quy-trinh`, label: 'Quy trình', module, status: 'ok', thuVien: true, icon: <NodeIndexOutlined /> },
  { key: `${goc}/huong-dan`, label: 'Hướng dẫn', module, status: 'ok', thuVien: true, icon: <QuestionCircleOutlined /> },
];

/**
 * Kế hoạch / Dự báo của một phân hệ = MỘT TAB của trang Kế hoạch / Dự báo.
 * Hai khoá quyền dùng chung (`/trung-tam-du-lieu/ke-hoach`, `/du-bao`) — tách
 * mục chỉ là chuyện điều hướng, không sinh khoá mới.
 */
const keHoachTab = (module: ModuleId, tab: string, nhan = ['Kế hoạch', 'Dự báo']): MenuLeaf[] => [
  { key: `/trung-tam-du-lieu/ke-hoach?tab=${tab}`, permKey: '/trung-tam-du-lieu/ke-hoach', label: nhan[0], module, status: 'ok', icon: <ScheduleOutlined /> },
  { key: `/trung-tam-du-lieu/du-bao?tab=${tab}`, permKey: '/trung-tam-du-lieu/du-bao', label: nhan[1], module, status: 'ok', icon: <RiseOutlined /> },
];

export const MENU_LEAVES: MenuLeaf[] = [
  // ===== Tổng quan =====
  { key: '/', label: 'Bảng điều hành', module: 'tong-quan', status: 'ok', icon: <DashboardOutlined /> },

  // ===== Phân tích (10) — sheet "PHÂN TÍCH": KH · DB · Thực hiện · So sánh =====
  ...keHoachTab('phan-tich', 'kqkd', ['P&L Kế hoạch', 'P&L Dự báo']),
  { key: '/bao-cao/pnl', label: 'P&L', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/pnl-3-lop', label: 'So sánh', module: 'phan-tich', status: 'ok', icon: <BarChartOutlined /> },
  { key: '/bao-cao/pnl-khong-khau-hao', label: 'P&L không khấu hao', module: 'phan-tich', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/phan-tich/cong-no', label: 'Công nợ', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <ReconciliationOutlined /> },
  { key: '/phan-tich/dong-tien', label: 'Dòng tiền', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <DollarOutlined /> },
  { key: '/phan-tich/ton-kho', label: 'Tồn kho', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <InboxOutlined /> },
  { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh toán', module: 'phan-tich', status: 'soon', quyenDaCap: true, icon: <StockOutlined /> },
  { key: '/phan-tich/chi-so-tai-chinh', label: 'Chỉ số tài chính', module: 'phan-tich', status: 'soon', icon: <FundOutlined /> },

  // ===== Tổng hợp (16 + cụm Báo cáo tài chính 5) =====
  ...thuVienCua('tong-hop', '/tong-hop'),
  // Sheet "TỔNG HỢP": Kế hoạch = "Chi tiết kế hoạch", Dự báo = "Chi tiết dự báo".
  ...keHoachTab('tong-hop', 'chi-tiet'),
  // "Thực hiện" chính là màn Dữ liệu tổng hợp (lưới chứng từ) — giữ route + khoá
  // quyền cũ '/chung-tu/nhat-ky-chung' để quyền đã cấp không mất.
  { key: '/chung-tu/nhat-ky-chung', label: 'Thực hiện', module: 'tong-hop', status: 'ok', icon: <CheckSquareOutlined /> },
  { key: '/tong-hop/quyet-toan-tam-ung', label: 'Quyết toán tạm ứng', module: 'tong-hop', status: 'soon', icon: <FileTextOutlined /> },
  { key: '/tong-hop/bu-tru-cong-no', label: 'Bù trừ công nợ', module: 'tong-hop', status: 'soon', icon: <InteractionOutlined /> },
  { key: '/chung-tu/ket-chuyen-lai-lo', label: 'Kết chuyển lãi lỗ', module: 'tong-hop', status: 'ok', icon: <SwapOutlined /> },
  { key: '/tong-hop/khoa-so', label: 'Khóa sổ', module: 'tong-hop', status: 'soon', icon: <LockOutlined /> },
  { key: '/tong-hop/so-nhat-ky-chung', label: 'Sổ nhật ký chung', module: 'tong-hop', status: 'soon', icon: <AuditOutlined /> },
  { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản', module: 'tong-hop', status: 'ok', icon: <AccountBookOutlined /> },
  { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ', module: 'tong-hop', status: 'soon', quyenDaCap: true, icon: <FileSearchOutlined /> },
  { key: '/bao-cao/bang-tong-hop', label: 'Tổng hợp công nợ', module: 'tong-hop', status: 'ok', icon: <TableOutlined /> },
  // Ba trang Danh mục kế toán, sheet đặt dưới Tổng hợp. Khoá quyền là khoá
  // Danh mục sẵn có — ma trận hiện chúng ở Tổng hợp (khử trùng giữ chỗ khai trước).
  { key: '/danh-muc/tai-khoan', label: 'Hệ thống tài khoản', module: 'tong-hop', status: 'ok', icon: <DatabaseOutlined /> },
  { key: '/danh-muc/quy-chuan', label: 'Quy chuẩn hạch toán', module: 'tong-hop', status: 'ok', icon: <SolutionOutlined /> },
  { key: '/danh-muc/tai-khoan-ket-chuyen', label: 'Tài khoản kết chuyển', module: 'tong-hop', status: 'ok', icon: <SwapOutlined /> },
  // Ba mục đầu trỏ trang /bao-cao/tai-chinh, chỉ khác `?tab=`. permKey giữ
  // '/bao-cao/tai-chinh' để KHÔNG sinh khoá quyền mới. Tab "So sánh lãi lỗ"
  // vẫn còn trong trang, sheet không đặt nó lên menu.
  { key: '/bao-cao/tai-chinh?tab=can-doi-ke-toan', permKey: '/bao-cao/tai-chinh', label: 'Bảng cân đối kế toán', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/tai-chinh?tab=ket-qua-kinh-doanh', permKey: '/bao-cao/tai-chinh', label: 'Kết quả kinh doanh', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <BarChartOutlined /> },
  { key: '/bao-cao/tai-chinh?tab=can-doi-tai-khoan', permKey: '/bao-cao/tai-chinh', label: 'Bảng cân đối tài khoản', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <TableOutlined /> },
  { key: '/bao-cao/tai-chinh/luu-chuyen-tien-te', label: 'Lưu chuyển tiền tệ', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'soon', icon: <SwapOutlined /> },
  { key: '/bao-cao/tai-chinh/thuyet-minh', label: 'Thuyết minh', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'soon', icon: <FileTextOutlined /> },

  // ===== Vốn & dòng tiền (11) =====
  ...thuVienCua('von-dong-tien', '/von-dong-tien'),
  ...keHoachTab('von-dong-tien', 'dong-tien'),
  { key: '/von-dong-tien/bao-cao', label: 'Báo cáo', module: 'von-dong-tien', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/chung-tu/phieu-thu', label: 'Thu tiền', module: 'von-dong-tien', status: 'ok', icon: <CreditCardOutlined /> },
  { key: '/chung-tu/phieu-chi', label: 'Chi tiền', module: 'von-dong-tien', status: 'ok', icon: <WalletOutlined /> },
  { key: '/von-dong-tien/kiem-ke', label: 'Kiểm kê', module: 'von-dong-tien', status: 'soon', icon: <ReconciliationOutlined /> },
  { key: '/so-quy', label: 'Sổ quỹ', module: 'von-dong-tien', status: 'ok', icon: <WalletOutlined /> },
  { key: '/von-dong-tien/vay', label: 'Vay, Cho vay', module: 'von-dong-tien', status: 'soon', icon: <BankOutlined /> },
  { key: '/von-dong-tien/von', label: 'Vốn', module: 'von-dong-tien', status: 'soon', icon: <GoldOutlined /> },

  // ===== Mua hàng (10) =====
  ...thuVienCua('mua-hang', '/mua-hang'),
  { key: '/mua-hang/ke-hoach', label: 'Kế hoạch', module: 'mua-hang', status: 'soon', icon: <ScheduleOutlined /> },
  { key: '/mua-hang/du-bao', label: 'Dự báo', module: 'mua-hang', status: 'soon', icon: <RiseOutlined /> },
  { key: '/mua-hang/bao-cao', label: 'Báo cáo', module: 'mua-hang', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/mua-hang/hop-dong', label: 'Hợp đồng mua', module: 'mua-hang', status: 'soon', icon: <FileProtectOutlined /> },
  { key: '/mua-hang/mua-hang', label: 'Mua hàng', module: 'mua-hang', status: 'soon', icon: <ShoppingOutlined /> },
  { key: '/mua-hang/so-chi-tiet', label: 'Sổ chi tiết mua hàng', module: 'mua-hang', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/mua-hang/tong-hop', label: 'Tổng hợp mua hàng', module: 'mua-hang', status: 'soon', icon: <TableOutlined /> },
  { key: '/cong-no/phai-tra', label: 'Công nợ phải trả', module: 'mua-hang', status: 'ok', icon: <ReconciliationOutlined /> },

  // ===== Bán hàng (11) =====
  // "Bán hàng" = trang quản lý đơn hàng, "Hợp đồng bán" = danh mục hợp đồng —
  // đúng như thanh ngang Bán hàng (đã bỏ) từng gọi hai trang này.
  ...thuVienCua('ban-hang', '/ban-hang'),
  ...keHoachTab('ban-hang', 'ban-hang'),
  { key: '/bao-cao/hop-dong', label: 'Báo cáo', module: 'ban-hang', status: 'ok', icon: <BarChartOutlined /> },
  // LỆCH sheet "Menu tài chính" (sheet không có mục này): trước đây chỉ vào được từ
  // thanh ngang Bán hàng; thanh ngang đã bỏ (11/09/2026) nên đưa lên menu dọc để
  // trang không mất lối vào. Khoá quyền giữ nguyên.
  { key: '/bao-cao/doanh-thu', label: 'Báo cáo doanh thu', module: 'ban-hang', status: 'ok', icon: <RiseOutlined /> },
  { key: '/danh-muc/hop-dong', label: 'Hợp đồng bán', module: 'ban-hang', status: 'ok', icon: <FileProtectOutlined /> },
  { key: '/trung-tam-du-lieu/hop-dong', label: 'Bán hàng', module: 'ban-hang', status: 'ok', icon: <FileDoneOutlined /> },
  { key: '/ban-hang/so-chi-tiet', label: 'Sổ chi tiết bán hàng', module: 'ban-hang', status: 'soon', icon: <ProfileOutlined /> },
  { key: '/ban-hang/tong-hop', label: 'Tổng hợp bán hàng', module: 'ban-hang', status: 'soon', icon: <TableOutlined /> },
  { key: '/cong-no/phai-thu', label: 'Công nợ phải thu', module: 'ban-hang', status: 'ok', icon: <ReconciliationOutlined /> },

  // ===== Tiền lương (11) — Chấm công / Tính lương sheet ghi "lấy từ bên nhân sự" =====
  ...thuVienCua('tien-luong', '/tien-luong'),
  ...keHoachTab('tien-luong', 'nhan-su'),
  { key: '/tien-luong/bao-cao', label: 'Báo cáo', module: 'tien-luong', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/tien-luong/cham-cong', label: 'Chấm công', module: 'tien-luong', status: 'soon', icon: <CalendarOutlined /> },
  { key: '/tien-luong/tinh-luong', label: 'Tính lương', module: 'tien-luong', status: 'soon', icon: <CalculatorOutlined /> },
  { key: '/tien-luong/tra-luong', label: 'Trả lương', module: 'tien-luong', status: 'soon', icon: <WalletOutlined /> },
  { key: '/tien-luong/hach-toan', label: 'Hạch toán lương', module: 'tien-luong', status: 'soon', icon: <AuditOutlined /> },
  { key: '/tien-luong/bhxh', label: 'Nộp bảo hiểm', module: 'tien-luong', status: 'soon', icon: <SafetyCertificateOutlined /> },
  { key: '/tien-luong/thue-tncn', label: 'Thuế TNCN', module: 'tien-luong', status: 'soon', icon: <PercentageOutlined /> },

  // ===== Kho (11) =====
  ...thuVienCua('kho', '/kho'),
  { key: '/kho/ke-hoach', label: 'Kế hoạch', module: 'kho', status: 'soon', icon: <ScheduleOutlined /> },
  { key: '/kho/du-bao', label: 'Dự báo', module: 'kho', status: 'soon', icon: <RiseOutlined /> },
  { key: '/kho/bao-cao', label: 'Báo cáo', module: 'kho', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok', icon: <FileAddOutlined /> },
  { key: '/kho/xuat-kho', label: 'Xuất kho', module: 'kho', status: 'ok', icon: <FileDoneOutlined /> },
  { key: '/kho/chuyen-kho', label: 'Chuyển kho', module: 'kho', status: 'ok', icon: <SwapOutlined /> },
  { key: '/kho/tinh-gia-xuat', label: 'Tính giá xuất kho', module: 'kho', status: 'soon', icon: <CalculatorOutlined /> },
  { key: '/kho/tong-hop-xuat', label: 'Tổng hợp xuất kho', module: 'kho', status: 'soon', icon: <TableOutlined /> },
  { key: '/kho/nhap-xuat-ton', label: 'Báo cáo nhập xuất tồn', module: 'kho', status: 'soon', icon: <BarChartOutlined /> },

  // ===== Tài sản (9) =====
  ...thuVienCua('tai-san', '/tai-san'),
  ...keHoachTab('tai-san', 'tai-san'),
  { key: '/tai-san/bao-cao', label: 'Báo cáo', module: 'tai-san', status: 'soon', icon: <BarChartOutlined /> },
  { key: '/trung-tam-du-lieu/tai-san', label: 'Quản lý tài sản', module: 'tai-san', status: 'soon', quyenDaCap: true, icon: <CarOutlined /> },
  { key: '/tai-san/phan-bo-khau-hao', label: 'Phân bổ khấu hao', module: 'tai-san', status: 'soon', icon: <FundOutlined /> },
  { key: '/tai-san/khau-hao', label: 'Tính khấu hao', module: 'tai-san', status: 'soon', icon: <CalculatorOutlined /> },
  { key: '/tai-san/dieu-chuyen', label: 'Điều chuyển', module: 'tai-san', status: 'soon', icon: <SwapOutlined /> },

  // ===== Công cụ dụng cụ (8) =====
  ...thuVienCua('ccdc', '/ccdc'),
  { key: '/ccdc/ke-hoach', label: 'Kế hoạch', module: 'ccdc', status: 'soon', icon: <ScheduleOutlined /> },
  { key: '/ccdc/du-bao', label: 'Dự báo', module: 'ccdc', status: 'soon', icon: <RiseOutlined /> },
  { key: '/ccdc/bao-cao', label: 'Báo cáo', module: 'ccdc', status: 'soon', icon: <BarChartOutlined /> },
  // Trang cũ chỉ là khung "đang phát triển" → đánh soon cho khỏi nói dối;
  // khoá quyền đã cấp từ trước nên giữ trong ma trận.
  { key: '/trung-tam-du-lieu/dung-cu', label: 'Quản lý công cụ dụng cụ', module: 'ccdc', status: 'soon', quyenDaCap: true, icon: <ToolOutlined /> },
  { key: '/ccdc/phan-bo', label: 'Phân bổ', module: 'ccdc', status: 'soon', icon: <TableOutlined /> },
  { key: '/ccdc/dieu-chuyen', label: 'Điều chuyển', module: 'ccdc', status: 'soon', icon: <SwapOutlined /> },

  // ===== Thuế (8) =====
  ...thuVienCua('thue', '/thue'),
  { key: '/thue/ke-hoach', label: 'Kế hoạch', module: 'thue', status: 'soon', icon: <ScheduleOutlined /> },
  { key: '/thue/du-bao', label: 'Dự báo', module: 'thue', status: 'soon', icon: <RiseOutlined /> },
  { key: '/thue/bao-cao-tndn', label: 'Tạm tính Thuế TNDN', module: 'thue', status: 'ok', icon: <BarChartOutlined /> },
  { key: '/thue/tong-hop', label: 'Tổng hợp', module: 'thue', status: 'ok', icon: <TableOutlined /> },
  { key: '/thue/bang-ke-mua-vao', label: 'Bảng kê mua vào', module: 'thue', status: 'ok', icon: <FileAddOutlined /> },
  { key: '/thue/bang-ke-ban-ra', label: 'Bảng kê bán ra', module: 'thue', status: 'ok', icon: <FileDoneOutlined /> },

  // ===== Hai cổng yêu cầu — phân hệ 1 mục, bấm rail vào thẳng =====
  { key: '/cong-yeu-cau/thanh-toan', label: 'Cổng yêu cầu thanh toán', module: 'yc-thanh-toan', status: 'soon', icon: <PayCircleOutlined /> },
  { key: '/cong-yeu-cau/xuat-hoa-don', label: 'Cổng yêu cầu xuất hóa đơn', module: 'yc-xuat-hoa-don', status: 'soon', icon: <FileSyncOutlined /> },

  // ===== Thư viện (4) — thư viện chung toàn công ty =====
  { key: '/quy-trinh', label: 'Quy trình', module: 'thu-vien', status: 'ok', icon: <NodeIndexOutlined /> },
  { key: '/chinh-sach', label: 'Chính sách', module: 'thu-vien', status: 'ok', icon: <SafetyCertificateOutlined /> },
  { key: '/bieu-mau', label: 'Biểu mẫu', module: 'thu-vien', status: 'ok', icon: <FormOutlined /> },
  { key: '/huong-dan', label: 'Hướng dẫn', module: 'thu-vien', status: 'ok', icon: <QuestionCircleOutlined /> },

  // ===== Danh mục (1) — 26 trang con lấy từ danhMucCatalog.ts =====
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
  { key: '/bao-cao/bang-can-doi', label: 'Bảng cân đối', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch', module: 'tong-hop', status: 'ok', legacy: true },
  { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo', module: 'tong-hop', status: 'ok', legacy: true },

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
 *  KHÔNG loại theo phân hệ: chỉ đúng route gộp, mục con của nó vẫn có khoá. */
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
 * về `pathOf`, nên các mục mang `?tab=` (Kế hoạch/Dự báo của nhiều phân hệ)
 * cộng 2 mục legacy cùng tên dồn về đúng 2 path; ba trang Danh mục đặt ở Tổng
 * hợp cũng trùng với route danh mục con. Để nguyên thì trang Lĩnh vực dựng
 * <Tree> với key trùng (antd báo lỗi, trạng thái tick không xác định) và lưu
 * cùng một key nhiều lần xuống `menuKeys` trong MongoDB.
 *
 * Giữ bản ĐẦU TIÊN để `parentLabel` là phân hệ đầu tiên khai mục đó —
 * '/trung-tam-du-lieu/ke-hoach' về 'Phân tích', đúng thứ tự khai báo.
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
