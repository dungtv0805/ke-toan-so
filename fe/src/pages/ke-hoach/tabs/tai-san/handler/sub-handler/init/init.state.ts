import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { BoPhan } from "@/types";
import type { KeHoachTaiSanDong } from "@/services/keHoachTaiSanService";
import type { DongNhap } from "../../../../lib/nhapBang";

/** Giá trị gõ được của một dòng kế hoạch tài sản. */
export interface TaiSanVal {
  /** Cấp cha — cột hiển thị mang nhãn "Nơi sử dụng". */
  boPhanId: string;
  maTaiSan: string;
  tenTaiSan: string;
  /** Cột DIỄN GIẢI. */
  ghiChu: string;
  soLuong: number;
  giaBinhQuan: number;
  thang: number[];
}

export const valTuDong = (d: KeHoachTaiSanDong): TaiSanVal => ({
  boPhanId: d.boPhan.id,
  maTaiSan: d.maTaiSan,
  tenTaiSan: d.tenTaiSan ?? "",
  ghiChu: d.ghiChu ?? "",
  soLuong: d.soLuong,
  giaBinhQuan: d.giaBinhQuan,
  thang: [...d.thang],
});

export interface TaiSanInitStates extends BaseStates {
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  data: KeHoachTaiSanDong[];
  loading: boolean;
  boPhanList: BoPhan[];
  masterDataLoaded: boolean;
  nhap: Record<string, TaiSanVal>;
  dongMoi: DongNhap<TaiSanVal>[];
  saving: boolean;
}

declare module "../../tai-san.handler" {
  interface TaiSanStates extends TaiSanInitStates {}
}
