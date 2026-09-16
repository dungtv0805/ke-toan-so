import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type {
  LichSuPheDuyet,
  QuyTrinhPheDuyet,
} from "@/services/pheDuyetService";

export interface ChiTietDrawerStates extends BaseStates {
  /** ID quy trình đang mở. null = đóng ngăn kéo. */
  dangMoId: string | null;
  chiTiet: QuyTrinhPheDuyet | null;
  lichSu: LichSuPheDuyet[];
  dangTaiChiTiet: boolean;
  dangXuLy: boolean;
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetStates extends ChiTietDrawerStates {}
}
