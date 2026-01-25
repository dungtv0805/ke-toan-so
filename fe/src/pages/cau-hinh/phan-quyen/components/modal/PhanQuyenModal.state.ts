import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { NguoiDung } from "@/types";

export interface ModalStates extends BaseStates {
  modalVisible: boolean;
  editingRecord: NguoiDung | null;
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates extends ModalStates {}
}
