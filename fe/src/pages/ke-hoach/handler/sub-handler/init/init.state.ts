import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { Dayjs } from "dayjs";
import type {
  ChiTieu,
  KeHoachDimension,
  KeHoachDong,
  LoaiKeHoach,
  SoSanhKetQua,
} from "@/services/keHoachService";
import type { MucDanhMuc } from "../../../lib/keHoachRow";

/** Khung nhìn: lưới nhập liệu hoặc một báo cáo so sánh theo chiều. */
export type KeHoachView = "list" | KeHoachDimension;

export interface KeHoachFilterStates {
  loaiKeHoach: LoaiKeHoach;
  phienBan?: string;
  phienBanList: string[];
  dateRange: [Dayjs, Dayjs];
  searchText: string;
  view: KeHoachView;
  chiTieu: ChiTieu;
}

export interface KeHoachDataStates {
  data: KeHoachDong[];
  loading: boolean;
  pagination: { total: number; page: number; limit: number; totalPages: number };
  selectedRowKeys: string[];
  soSanh: SoSanhKetQua | null;
  soSanhLoading: boolean;
}

export interface KeHoachMasterDataStates {
  taiKhoanList: MucDanhMuc[];
  doiTuongList: MucDanhMuc[];
  duAnList: MucDanhMuc[];
  boPhanList: MucDanhMuc[];
  sanPhamList: MucDanhMuc[];
  dongTienList: MucDanhMuc[];
  khoanMucList: MucDanhMuc[];
  nhomQuanLyList: MucDanhMuc[];
  chuDauTuList: MucDanhMuc[];
  nhomKhoanMucList: MucDanhMuc[];
  /** Danh sách nghiệp vụ lấy từ Quy chuẩn hạch toán (kèm TK Nợ/Có gợi ý). */
  quyChuanList: { nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string }[];
  masterDataLoaded: boolean;
}

export interface KeHoachInitStates
  extends BaseStates,
    KeHoachFilterStates,
    KeHoachDataStates,
    KeHoachMasterDataStates {}

declare module "../../ke-hoach.handler" {
  interface KeHoachStates extends KeHoachInitStates {}
}
