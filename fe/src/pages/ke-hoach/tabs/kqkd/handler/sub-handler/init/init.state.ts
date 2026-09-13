import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type {
  KqkdKeHoachReport,
  NguonKqkd,
} from "@/services/kqkdKeHoachService";
import type { HangKqkd } from "../../../lib/kqkdKeHoachRows";

export interface KqkdInitStates extends BaseStates {
  loaiKeHoach: NguonKqkd;
  nam: number;
  hang: HangKqkd[];
  /** Báo cáo gốc — giữ lại để tính cột "%DS" theo từng kỳ. */
  baoCao: KqkdKeHoachReport | null;
  loading: boolean;
}

declare module "../../kqkd.handler" {
  interface KqkdStates extends KqkdInitStates {}
}
