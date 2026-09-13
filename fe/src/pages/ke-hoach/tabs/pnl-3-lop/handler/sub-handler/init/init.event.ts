import { BaseEvents } from "@/common";
import type { Lop } from "../../../lib/pnl3LopRows";

export interface Pnl3LopInitEvent extends BaseEvents {
  init: { params: { nam: number; phienBan?: string }; result: void };
  doiLop: { params: { lop: Lop }; result: void };
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopEvents extends Pnl3LopInitEvent {}
}
