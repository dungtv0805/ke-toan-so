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

/** Bán hàng — trang quản lý hợp đồng + báo cáo hợp đồng. */
export const BAN_HANG_NAV: SectionNavItem[] = [
  {
    label: "Bán hàng",
    path: "/trung-tam-du-lieu/hop-dong",
    icon: <FileProtectOutlined />,
  },
  { label: "Báo cáo", path: "/bao-cao/hop-dong", icon: <BarChartOutlined /> },
];
