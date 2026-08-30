import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface NhanSuInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach };
    result: void;
  };
  refresh: { params: {}; result: void };
}

declare module "../../nhan-su.handler" {
  interface NhanSuEvents extends NhanSuInitEvent {}
}
