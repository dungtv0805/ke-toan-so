import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface DongTienInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach };
    result: void;
  };
  refresh: { params: {}; result: void };
}

declare module "../../dong-tien.handler" {
  interface DongTienEvents extends DongTienInitEvent {}
}
