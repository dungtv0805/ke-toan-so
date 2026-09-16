import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { QuyTrinhPheDuyet } from "@/services/pheDuyetService";

export interface DanhSachChoDuyetStates extends BaseStates {
  danhSach: QuyTrinhPheDuyet[];
  dangTai: boolean;
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetStates extends DanhSachChoDuyetStates {}
}
