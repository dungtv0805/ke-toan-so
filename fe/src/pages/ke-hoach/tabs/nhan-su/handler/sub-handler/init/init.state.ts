import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { BoPhan } from "@/types";
import type {
  ChiPhiNhanSu,
  KeHoachNhanSuDong,
} from "@/services/keHoachNhanSuService";

/** Khoá của dòng đang thêm mới — không trùng id thật của MongoDB. */
export const DONG_MOI_KEY = "__moi__";

/** Giá trị đang gõ trên dòng được sửa. */
export interface NhanSuForm {
  boPhanId?: string;
  maViTri: string;
  tenChucVu: string;
  chiPhi: ChiPhiNhanSu;
  thang: number[];
}

export interface NhanSuInitStates extends BaseStates {
  nam: number;
  data: KeHoachNhanSuDong[];
  loading: boolean;
  boPhanList: BoPhan[];
  masterDataLoaded: boolean;
  /** null = không sửa gì; DONG_MOI_KEY = đang thêm dòng mới. */
  editingKey: string | null;
  formValues: NhanSuForm | null;
  saving: boolean;
}

declare module "../../nhan-su.handler" {
  interface NhanSuStates extends NhanSuInitStates {}
}
