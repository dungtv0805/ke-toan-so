import { BaseEvents } from "@/common";
import type { ChiTieu, KeHoachDimension } from "@/services/keHoachService";

export interface KeHoachSoSanhEvent extends BaseEvents {
  loadSoSanh: { params: {}; result: void };
  doiView: { params: { view: "list" | KeHoachDimension }; result: void };
  doiChiTieu: { params: { chiTieu: ChiTieu }; result: void };
}

declare module "../../ke-hoach.handler" {
  interface KeHoachEvents extends KeHoachSoSanhEvent {}
}
