import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { Kqkd3LopReport } from "@/services/kqkd3LopService";
import type { Lop } from "../../../lib/pnl3LopRows";

export interface Pnl3LopInitStates extends BaseStates {
  nam: number;
  baoCao: Kqkd3LopReport | null;
  loading: boolean;
  /**
   * Lớp đang xem. Cột của bảng là các KỲ (như bảng P&L), nên thứ người dùng
   * chọn là xem lớp nào: Kế hoạch / Dự báo / Thực hiện / Chênh lệch / % đạt.
   */
  lop: Lop;
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopStates extends Pnl3LopInitStates {}
}
