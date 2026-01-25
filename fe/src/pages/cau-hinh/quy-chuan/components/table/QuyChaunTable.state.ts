import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { QuyChuan } from "@/types";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuyChaunTableStates extends BaseStates {
  quyChaunList: QuyChuan[];
  loading: boolean;
  activeTab: string;
  pagination: PaginationMeta;
}

declare module "../../quyChaunHandler" {
  interface QuyChaunStates extends QuyChaunTableStates {}
}
