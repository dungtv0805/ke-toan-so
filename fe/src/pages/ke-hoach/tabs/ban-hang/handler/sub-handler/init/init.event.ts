import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface BanHangInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach };
    result: void;
  };
  refresh: { params: {}; result: void };
}

declare module "../../ban-hang.handler" {
  interface BanHangEvents extends BanHangInitEvent {}
}
