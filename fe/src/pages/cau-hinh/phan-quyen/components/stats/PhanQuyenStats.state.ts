import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NguoiDungStats } from "@/services/nguoiDungService";

export interface StatsStates extends BaseStates {
  stats: NguoiDungStats | null;
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates extends StatsStates {}
}
