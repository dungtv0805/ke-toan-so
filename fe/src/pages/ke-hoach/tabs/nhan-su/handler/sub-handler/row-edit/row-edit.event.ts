import { BaseEvents } from "@/common";
import type { ChiPhiNhanSu } from "@/services/keHoachNhanSuService";
import type { NhanSuVal } from "../init/init.state";

export interface NhanSuRowEditEvent extends BaseEvents {
  /** Thêm một dòng trống. Truyền `boPhanId` để chèn thẳng vào đúng bộ phận. */
  themDong: { params: { boPhanId?: string }; result: void };
  suaO: { params: { id: string; patch: Partial<NhanSuVal> }; result: void };
  suaChiPhi: {
    params: { id: string; khoa: keyof ChiPhiNhanSu; giaTri: number };
    result: void;
  };
  suaThang: {
    params: { id: string; chiSo: number; giaTri: number };
    result: void;
  };
  boDong: { params: { id: string }; result: void };
  huyThayDoi: { params: {}; result: void };
  luuTatCa: { params: {}; result: void };
}

declare module "../../nhan-su.handler" {
  interface NhanSuEvents extends NhanSuRowEditEvent {}
}
