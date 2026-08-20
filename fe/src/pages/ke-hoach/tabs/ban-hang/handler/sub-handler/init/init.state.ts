import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { NhomSanPham, SanPham } from "@/types";
import type { KeHoachBanHangDong } from "@/services/keHoachBanHangService";

/** Khoá của dòng đang thêm mới — không trùng id thật của MongoDB. */
export const DONG_MOI_KEY = "__moi__";

/** Giá trị đang gõ trên dòng được sửa. */
export interface BanHangForm {
  /** Mã nhóm sản phẩm — `SanPham.nhom` lưu mã chứ không lưu id. */
  nhomMa?: string;
  sanPhamId?: string;
  luong: number;
  giaBinhQuan: number;
  thang: number[];
}

export interface BanHangInitStates extends BaseStates {
  nam: number;
  data: KeHoachBanHangDong[];
  loading: boolean;
  nhomSanPhamList: NhomSanPham[];
  sanPhamList: SanPham[];
  masterDataLoaded: boolean;
  /** null = không sửa gì; DONG_MOI_KEY = đang thêm dòng mới. */
  editingKey: string | null;
  formValues: BanHangForm | null;
  saving: boolean;
}

declare module "../../ban-hang.handler" {
  interface BanHangStates extends BanHangInitStates {}
}
