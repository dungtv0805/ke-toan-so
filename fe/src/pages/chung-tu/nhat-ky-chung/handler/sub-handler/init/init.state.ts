import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NhatKyChung } from "@/types";
import dayjs from "dayjs";

export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
  chiTietTheo?: string;
}

export interface KhoanMucItem {
  id: string;
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface StatsData {
  tongButToan: number;
  tongThu: number;
  tongChi: number;
  soDu: number;
  /** Tổng giá trị bút toán khớp bộ lọc — hàng số liệu tổng quan. */
  tongGiaTri: number;
}

export interface AccountSummary {
  taiKhoan: string;
  phatSinhNo: number;
  phatSinhCo: number;
}

export interface TeamSummary {
  doi: string;
  tongChi: number;
  soButToan: number;
  chiTiet: { nhanVien: string; soTien: number; soButToan: number }[];
}

export interface EmployeeSummary {
  nhanVien: string;
  doi: string;
  tongChi: number;
  soButToan: number;
}

export interface ProjectSummary {
  duAn: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export interface ChuDauTuSummary {
  chuDauTu: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export interface SanPhamSummary {
  sanPham: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export interface DongTienSummary {
  dongTien: string;
  tongThu: number;
  tongChi: number;
  soButToan: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InitStates extends BaseStates {
  data: NhatKyChung[];
  loading: boolean;
  taiKhoanList: TaiKhoanItem[];
  khoanMucList: KhoanMucItem[];
  nguoiGiaoDichList: string[];
  stats: StatsData;
  summaryByAccount: AccountSummary[];
  summaryByTeam: TeamSummary[];
  summaryByEmployee: EmployeeSummary[];
  summaryByProject: ProjectSummary[];
  summaryByChuDauTu: ChuDauTuSummary[];
  summaryBySanPham: SanPhamSummary[];
  summaryByDongTien: DongTienSummary[];
  // Pagination state
  pagination: PaginationMeta;
  // Filter states — mỗi key khớp một tiêu chí trong NKC_FILTER_PARAMS
  searchText: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  filterKiemSoat: string | undefined;
  filterLoaiChungTu: string | undefined;
  filterNghiepVu: string | undefined;
  filterTaiKhoan: string | undefined;
  filterDoiTuong: string | undefined;
  filterKhoanMuc: string | undefined;
  filterNhanVien: string | undefined;
  filterDuAn: string | undefined;
  filterSanPham: string | undefined;
  filterHopDong: string | undefined;
  filterNguoiGiaoDich: string | undefined;
  filterDoi: string | undefined;
  filterBoPhan: string | undefined;
  filterNhomKhuyenMai: string | undefined;
  filterAccount: string | undefined;
  filterTaiKhoanCo: string | undefined;
  // UI states
  activeTab: string;
  statsCollapsed: boolean;
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungStates extends InitStates {}
}
