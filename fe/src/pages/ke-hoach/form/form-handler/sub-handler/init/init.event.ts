import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { KeHoachFormHeader } from "./init.state";

export interface KeHoachFormInitEvent extends BaseEvents {
  init: { params: { loaiKeHoach: LoaiKeHoach }; result: void };
  updateHeader: {
    params: { field: keyof KeHoachFormHeader; value: unknown };
    result: void;
  };
}

declare module "../../ke-hoach-form.handler" {
  interface KeHoachFormEvents extends KeHoachFormInitEvent {}
}
