import { BaseEvents } from "@/common";
import type { DongKeHoach } from "../../../lib/keHoachFormRows";

export interface KeHoachFormDongEvent extends BaseEvents {
  themDong: { params: { soLuong?: number }; result: void };
  xoaDong: { params: { key: string }; result: void };
  nhanBanDong: { params: { key: string }; result: void };
  suaDong: {
    params: { key: string; field: keyof DongKeHoach; value: unknown };
    result: void;
  };
}

declare module "../../ke-hoach-form.handler" {
  interface KeHoachFormEvents extends KeHoachFormDongEvent {}
}
