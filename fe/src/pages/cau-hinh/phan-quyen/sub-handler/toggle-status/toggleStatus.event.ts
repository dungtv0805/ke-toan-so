import { BaseEvents } from "@/common";
import { NguoiDung } from "@/types";

export interface ToggleStatusEvent extends BaseEvents {
  toggleStatus: { params: { id: string }; result: NguoiDung };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends ToggleStatusEvent {}
}
