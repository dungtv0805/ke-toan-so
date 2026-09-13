import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { Kqkd3LopReport } from "@/services/kqkd3LopService";

export interface Pnl3LopInitStates extends BaseStates {
  nam: number;
  baoCao: Kqkd3LopReport | null;
  loading: boolean;
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopStates extends Pnl3LopInitStates {}
}
