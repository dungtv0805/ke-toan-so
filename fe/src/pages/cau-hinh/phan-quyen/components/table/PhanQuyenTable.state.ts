import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NguoiDung, VaiTro } from "@/types";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TableStates extends BaseStates {
  nguoiDungList: NguoiDung[];
  pagination: Pagination;
  searchText: string;
  filterVaiTro: VaiTro | "all";
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates extends TableStates {}
}
