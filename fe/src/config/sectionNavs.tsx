import {
  CreditCardOutlined,
  WalletOutlined,
  AuditOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  SwapOutlined,
  ReconciliationOutlined,
  FileProtectOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TableOutlined,
} from "@ant-design/icons";
import type { SectionNavItem } from "@/components/layout/SectionNav";

/**
 * Các thanh ngang dùng chung giữa những trang cùng nhóm nghiệp vụ.
 * Nguồn duy nhất để sửa nhãn/thứ tự — trang chỉ việc render <SectionNav items={...} />.
 */

/** Chứng từ — hiện trên Dữ liệu tổng hợp + các trang phiếu. */
export const CHUNG_TU_NAV: SectionNavItem[] = [
  { label: "Phiếu thu", path: "/chung-tu/phieu-thu", icon: <CreditCardOutlined /> },
  { label: "Phiếu chi", path: "/chung-tu/phieu-chi", icon: <WalletOutlined /> },
  {
    label: "Kết chuyển lãi lỗ",
    path: "/chung-tu/ket-chuyen-lai-lo",
    icon: <SwapOutlined />,
  },
  {
    label: "Phiếu kế toán",
    path: "/chung-tu/phieu-ke-toan",
    icon: <AuditOutlined />,
    comingSoon: true,
  },
];

/** Kho — hiện trên các trang phiếu kho. */
export const KHO_NAV: SectionNavItem[] = [
  { label: "Nhập kho", path: "/kho/nhap-kho", icon: <FileAddOutlined /> },
  { label: "Xuất kho", path: "/kho/xuat-kho", icon: <FileDoneOutlined /> },
  { label: "Chuyển kho", path: "/kho/chuyen-kho", icon: <SwapOutlined /> },
  {
    label: "Kiểm kê kho",
    path: "/kho/kiem-ke",
    icon: <ReconciliationOutlined />,
    comingSoon: true,
  },
];

/**
 * Thuế — 4 trang thuế đứng ngang trên đầu trang, sidebar chỉ còn một mục "Thuế".
 * Thứ tự ở đây cũng là thứ tự ưu tiên khi vào thẳng /thue (xem ThueIndexRoute).
 */
export const THUE_NAV: SectionNavItem[] = [
  { label: "Bảng kê mua vào", path: "/thue/bang-ke-mua-vao", icon: <FileAddOutlined /> },
  { label: "Bảng kê bán ra", path: "/thue/bang-ke-ban-ra", icon: <FileDoneOutlined /> },
  { label: "Tổng hợp thuế", path: "/thue/tong-hop", icon: <TableOutlined /> },
  { label: "Báo cáo nhanh thuế TNDN", path: "/thue/bao-cao-tndn", icon: <BarChartOutlined /> },
];

/**
 * Bán hàng — quản lý đơn hàng + báo cáo + danh mục hợp đồng.
 * "Hợp đồng" chỉ hiện với ai có quyền `/danh-muc/hop-dong:xem` (SectionNav tự lọc).
 */
export const BAN_HANG_NAV: SectionNavItem[] = [
  {
    label: "Bán hàng",
    path: "/trung-tam-du-lieu/hop-dong",
    icon: <FileProtectOutlined />,
  },
  { label: "Báo cáo", path: "/bao-cao/hop-dong", icon: <BarChartOutlined /> },
  { label: "Hợp đồng", path: "/danh-muc/hop-dong", icon: <FileTextOutlined /> },
];
