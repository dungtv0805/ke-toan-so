import { BaseEvents } from "@/common";
import type { BanHangForm } from "../init/init.state";

export interface BanHangRowEditEvent extends BaseEvents {
  themDong: { params: {}; result: void };
  batDauSua: { params: { key: string }; result: void };
  huySua: { params: {}; result: void };
  datForm: { params: { patch: Partial<BanHangForm> }; result: void };
  datThang: { params: { chiSo: number; giaTri: number }; result: void };
  luuDong: { params: {}; result: void };
  xoaDong: { params: { id: string }; result: void };
}

declare module "../../ban-hang.handler" {
  interface BanHangEvents extends BanHangRowEditEvent {}
}
