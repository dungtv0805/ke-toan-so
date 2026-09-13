import { BaseEvents } from "@/common";

export interface Pnl3LopInitEvent extends BaseEvents {
  init: { params: { nam: number; phienBan?: string }; result: void };
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopEvents extends Pnl3LopInitEvent {}
}
