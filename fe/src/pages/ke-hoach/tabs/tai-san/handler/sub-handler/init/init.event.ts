import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface TaiSanInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach };
    result: void;
  };
  refresh: { params: {}; result: void };
}

declare module "../../tai-san.handler" {
  interface TaiSanEvents extends TaiSanInitEvent {}
}
