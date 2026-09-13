import { BaseEvents } from "@/common";
import type { NguonKqkd } from "@/services/kqkdKeHoachService";

export interface KqkdInitEvent extends BaseEvents {
  init: {
    params: { nam: number; loaiKeHoach: NguonKqkd; phienBan?: string };
    result: void;
  };
}

declare module "../../kqkd.handler" {
  interface KqkdEvents extends KqkdInitEvent {}
}
