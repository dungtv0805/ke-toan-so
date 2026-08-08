import type { ReactNode } from "react";
import {
  TableOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
  BankOutlined,
  ShoppingOutlined,
  DollarOutlined,
  AppstoreOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { SummaryType } from "@/services/nhatKyChungService";
import { EntryListTab } from "./EntryListTab";
import { SummaryTab } from "./SummaryTab";
import { TeamTab } from "./TeamTab";
import { EmployeeTab } from "./EmployeeTab";
import { ProjectTab } from "./ProjectTab";
import { ChuDauTuTab } from "./ChuDauTuTab";
import { SanPhamTab } from "./SanPhamTab";
import { DongTienTab } from "./DongTienTab";
import { NhomQuanLyTab } from "./NhomQuanLyTab";
import { NhomKhuyenMaiTab } from "./NhomKhuyenMaiTab";

export interface NkcView {
  key: string;
  label: string;
  icon: ReactNode;
  /** Loại báo cáo tổng hợp cần nạp khi mở view (view danh sách bút toán không có). */
  summaryType?: SummaryType;
  render: () => ReactNode;
}

/**
 * Các màn hình con của "Dữ liệu tổng hợp". Trước đây là thanh tab; theo tài liệu
 * cải tiến 08.08.26 chuyển thành 1 dropdown trên hàng lọc — nội dung giữ nguyên.
 */
export const NKC_VIEWS: NkcView[] = [
  {
    key: "list",
    label: "Bút toán",
    icon: <TableOutlined />,
    render: () => <EntryListTab />,
  },
  {
    key: "summary",
    label: "Báo cáo theo tài khoản",
    icon: <FilterOutlined />,
    summaryType: "account",
    render: () => <SummaryTab />,
  },
  {
    key: "team",
    label: "Báo cáo theo đội",
    icon: <TeamOutlined />,
    summaryType: "team",
    render: () => <TeamTab />,
  },
  {
    key: "employee",
    label: "Báo cáo theo nhân viên",
    icon: <UserOutlined />,
    summaryType: "employee",
    render: () => <EmployeeTab />,
  },
  {
    key: "project",
    label: "Báo cáo theo dự án",
    icon: <ProjectOutlined />,
    summaryType: "project",
    render: () => <ProjectTab />,
  },
  {
    key: "chudautu",
    label: "Báo cáo theo chủ đầu tư",
    icon: <BankOutlined />,
    summaryType: "investor",
    render: () => <ChuDauTuTab />,
  },
  {
    key: "sanpham",
    label: "Báo cáo theo sản phẩm",
    icon: <ShoppingOutlined />,
    summaryType: "product",
    render: () => <SanPhamTab />,
  },
  {
    key: "dongtien",
    label: "Báo cáo theo dòng tiền",
    icon: <DollarOutlined />,
    summaryType: "cash-flow",
    render: () => <DongTienTab />,
  },
  {
    key: "nhomquanly",
    label: "Báo cáo theo nhóm quản lý",
    icon: <AppstoreOutlined />,
    summaryType: "management-group",
    render: () => <NhomQuanLyTab />,
  },
  {
    key: "nhomkm",
    label: "Báo cáo theo nhóm KM",
    icon: <GiftOutlined />,
    summaryType: "promotion-group",
    render: () => <NhomKhuyenMaiTab />,
  },
];

export const findNkcView = (key: string): NkcView =>
  NKC_VIEWS.find((v) => v.key === key) ?? NKC_VIEWS[0];
