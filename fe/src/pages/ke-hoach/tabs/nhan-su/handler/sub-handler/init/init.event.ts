import { BaseEvents } from "@/common";

export interface NhanSuInitEvent extends BaseEvents {
  init: { params: { nam: number }; result: void };
  refresh: { params: {}; result: void };
}

declare module "../../nhan-su.handler" {
  interface NhanSuEvents extends NhanSuInitEvent {}
}
