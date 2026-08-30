import { BaseEvents } from "@/common";
import type { LoaiKeHoach } from "@/services/keHoachService";

export interface KqkdInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: LoaiKeHoach; phienBan?: string };
    result: void;
  };
}

declare module "../../kqkd.handler" {
  interface KqkdEvents extends KqkdInitEvent {}
}
