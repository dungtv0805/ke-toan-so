import { BaseEvents } from "@/common";
import type { ChiPhiNhanSu } from "@/services/keHoachNhanSuService";
import type { NhanSuForm } from "../init/init.state";

export interface NhanSuRowEditEvent extends BaseEvents {
  themDong: { params: {}; result: void };
  batDauSua: { params: { key: string }; result: void };
  huySua: { params: {}; result: void };
  datForm: { params: { patch: Partial<NhanSuForm> }; result: void };
  datChiPhi: {
    params: { khoa: keyof ChiPhiNhanSu; giaTri: number };
    result: void;
  };
  datThang: { params: { chiSo: number; giaTri: number }; result: void };
  luuDong: { params: {}; result: void };
  xoaDong: { params: { id: string }; result: void };
}

declare module "../../nhan-su.handler" {
  interface NhanSuEvents extends NhanSuRowEditEvent {}
}
