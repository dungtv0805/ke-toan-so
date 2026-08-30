import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface NguonVonInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach };
    result: void;
  };
  refresh: { params: {}; result: void };
  /** Bật/tắt dòng phụ Số dư. */
  doiHienSoDu: { params: {}; result: void };
}

declare module "../../nguon-von.handler" {
  interface NguonVonEvents extends NguonVonInitEvent {}
}
