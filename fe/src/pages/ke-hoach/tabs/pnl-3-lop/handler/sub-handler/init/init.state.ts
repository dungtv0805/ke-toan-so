import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { Kqkd3LopReport } from "@/services/kqkd3LopService";
import type { Ky } from "../../../lib/pnl3LopRows";

export interface Pnl3LopInitStates extends BaseStates {
  nam: number;
  baoCao: Kqkd3LopReport | null;
  loading: boolean;
  /** Kỳ đang xem: cả năm, một quý hoặc một tháng. */
  ky: Ky;
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopStates extends Pnl3LopInitStates {}
}
