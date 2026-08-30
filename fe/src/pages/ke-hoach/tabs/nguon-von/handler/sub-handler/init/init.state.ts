import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type {
  KeHoachNguonVonDong,
  NhomNguonVon,
} from "@/services/keHoachNguonVonService";
import type { DongNhap } from "../../../../lib/nhapBang";

/** Giá trị gõ được của một dòng kế hoạch nguồn vốn. */
export interface NguonVonVal {
  nhom: NhomNguonVon;
  maChiTieu: string;
  tenChiTieu: string;
  /** Cột DIỄN GIẢI. */
  ghiChu: string;
  soDuDauNam: number;
  giaTriMucTieu: number;
  /** BIẾN ĐỘNG từng tháng, cho phép âm. */
  thang: number[];
}

export const valTuDong = (d: KeHoachNguonVonDong): NguonVonVal => ({
  nhom: d.nhom,
  maChiTieu: d.maChiTieu,
  tenChiTieu: d.tenChiTieu ?? "",
  ghiChu: d.ghiChu ?? "",
  soDuDauNam: d.soDuDauNam,
  giaTriMucTieu: d.giaTriMucTieu,
  thang: [...d.thang],
});

export interface NguonVonInitStates extends BaseStates {
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  data: KeHoachNguonVonDong[];
  loading: boolean;
  nhap: Record<string, NguonVonVal>;
  dongMoi: DongNhap<NguonVonVal>[];
  saving: boolean;
  /** Hiện dòng phụ Số dư dưới mỗi hàng chi tiết. */
  hienSoDu: boolean;
}

declare module "../../nguon-von.handler" {
  interface NguonVonStates extends NguonVonInitStates {}
}
