import { BaseEvents } from "@/common";
import type { Ky } from "../../../lib/pnl3LopRows";

export interface Pnl3LopInitEvent extends BaseEvents {
  init: { params: { nam: number; phienBan?: string }; result: void };
  doiKy: { params: { ky: Ky }; result: void };
}

declare module "../../pnl-3-lop.handler" {
  interface Pnl3LopEvents extends Pnl3LopInitEvent {}
}
