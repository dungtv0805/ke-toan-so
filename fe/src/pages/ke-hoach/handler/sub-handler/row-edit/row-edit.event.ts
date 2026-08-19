import { BaseEvents } from "@/common";
import type { KeHoachDong } from "@/services/keHoachService";
import type { RowValues } from "../../../lib/keHoachRow";

export interface KeHoachRowEditEvent extends BaseEvents {
  suaDong: { params: { record: KeHoachDong }; result: void };
  doiGiaTri: { params: { field: keyof RowValues; value: unknown }; result: void };
  luuDong: { params: {}; result: void };
  huySuaDong: { params: {}; result: void };
  xoaDong: { params: { id: string }; result: void };
  xoaNhieuDong: { params: {}; result: void };
  nhanBanDong: { params: { record: KeHoachDong }; result: void };
}

declare module "../../ke-hoach.handler" {
  interface KeHoachEvents extends KeHoachRowEditEvent {}
}
