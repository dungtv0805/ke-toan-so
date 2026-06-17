import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ChungTu } from "@/types";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStats } from "@/services/phieuService";

export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
  chiTietTheo?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InitStates extends BaseStates {
  config: PhieuConfig | null;
  data: ChungTu[];
  loading: boolean;
  taiKhoanList: TaiKhoanItem[];
  stats: PhieuStats;
  pagination: PaginationMeta;
  searchText: string;
  dateRange: [{ format: (f: string) => string }, { format: (f: string) => string }] | null;
  filterDoiTuong: string | undefined;
  filterDuAn: string | undefined;
  filterBoPhan: string | undefined;
  filterTaiKhoanNo: string | undefined;
  filterTaiKhoanCo: string | undefined;
  activeTab: string;
  statsCollapsed: boolean;
}

declare module "../../../phieu.handler" {
  interface PhieuStates extends InitStates {}
}
