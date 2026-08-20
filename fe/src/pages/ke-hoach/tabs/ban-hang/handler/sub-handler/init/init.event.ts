import { BaseEvents } from "@/common";

export interface BanHangInitEvent extends BaseEvents {
  init: { params: { nam: number }; result: void };
  refresh: { params: {}; result: void };
}

declare module "../../ban-hang.handler" {
  interface BanHangEvents extends BanHangInitEvent {}
}
