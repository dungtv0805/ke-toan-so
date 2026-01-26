import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { QuyChuan } from "@/types";
import { LoaiChungTuType } from "@/services/loaiChungTuService";

export interface QuyChaunFormStates extends BaseStates {
  modalVisible: boolean;
  editingRecord: QuyChuan | null;
  formLoading: boolean;
  loaiChungTuList: LoaiChungTuType[];
}

declare module "../../quyChaunHandler" {
  interface QuyChaunStates extends QuyChaunFormStates {}
}
