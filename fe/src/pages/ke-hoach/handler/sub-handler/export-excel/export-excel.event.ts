import { BaseEvents } from "@/common";

export interface KeHoachExportEvent extends BaseEvents {
  xuatExcel: { params: {}; result: void };
}

declare module "../../ke-hoach.handler" {
  interface KeHoachEvents extends KeHoachExportEvent {}
}
