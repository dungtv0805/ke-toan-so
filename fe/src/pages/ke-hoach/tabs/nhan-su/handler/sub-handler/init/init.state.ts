import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { BoPhan } from "@/types";
import type {
  ChiPhiNhanSu,
  KeHoachNhanSuDong,
} from "@/services/keHoachNhanSuService";
import type { DongNhap } from "../../../../lib/nhapBang";

/** Giá trị gõ được của một dòng nhân sự. */
export interface NhanSuVal {
  boPhanId: string;
  maViTri: string;
  tenChucVu: string;
  /** Cột DIỄN GIẢI — lưu vào trường `ghiChu` của bản ghi. */
  ghiChu: string;
  chiPhi: ChiPhiNhanSu;
  thang: number[];
}

/** Giá trị gõ được, rút từ một dòng đã lưu. */
export const valTuDong = (d: KeHoachNhanSuDong): NhanSuVal => ({
  boPhanId: d.boPhan.id,
  maViTri: d.maViTri,
  tenChucVu: d.tenChucVu ?? "",
  ghiChu: d.ghiChu ?? "",
  chiPhi: { ...d.chiPhi },
  thang: [...d.thang],
});

export interface NhanSuInitStates extends BaseStates {
  nam: number;
  data: KeHoachNhanSuDong[];
  loading: boolean;
  boPhanList: BoPhan[];
  masterDataLoaded: boolean;
  /** Sửa đổi chưa lưu của các dòng ĐÃ LƯU, khoá theo id dòng. */
  nhap: Record<string, NhanSuVal>;
  /** Dòng mới chưa lưu, thêm bao nhiêu cũng được. */
  dongMoi: DongNhap<NhanSuVal>[];
  saving: boolean;
}

declare module "../../nhan-su.handler" {
  interface NhanSuStates extends NhanSuInitStates {}
}
