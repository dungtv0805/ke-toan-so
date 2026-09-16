import { BaseEvents } from "@/common";
import type { QuyTrinhPheDuyet } from "@/services/pheDuyetService";

export interface CapNhatChiTietEvent extends BaseEvents {
  capNhatChiTiet: { params: { quyTrinh: QuyTrinhPheDuyet }; result: void };
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetEvents extends CapNhatChiTietEvent {}
}
