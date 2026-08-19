import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { RowValues } from "../../../lib/keHoachRow";

/** Id giả của dòng đang thêm mới (chưa có id thật từ BE). */
export const DONG_MOI_ID = "__dong-moi__";

export interface KeHoachRowEditStates extends BaseStates {
  editingRowId: string | null;
  editingValues: RowValues;
  savingRow: boolean;
}

declare module "../../ke-hoach.handler" {
  interface KeHoachStates extends KeHoachRowEditStates {}
}
