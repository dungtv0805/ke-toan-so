import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface KeHoachInitEvent extends BaseEvents {
  init: { params: { loaiKeHoach: LoaiKeHoach }; result: void };
  refresh: { params: {}; result: void };
  loadPage: { params: { page: number; limit?: number }; result: void };
}

declare module "../../ke-hoach.handler" {
  interface KeHoachEvents extends KeHoachInitEvent {}
}
