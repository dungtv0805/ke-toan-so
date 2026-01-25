import { BaseEvents } from "@/common";
import { VaiTro } from "@/types";
import { NguoiDungStats } from "@/services/nguoiDungService";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  vaiTro?: VaiTro;
  trangThai?: "HOAT_DONG" | "KHOA";
}

export interface FetchDataEvent extends BaseEvents {
  fetchData: { params: PaginationParams; result: void };
  fetchStats: { params: Record<string, never>; result: NguoiDungStats };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends FetchDataEvent {}
}
