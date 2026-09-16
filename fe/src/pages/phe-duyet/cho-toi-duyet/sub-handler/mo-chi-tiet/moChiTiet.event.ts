import { BaseEvents } from "@/common";

export interface MoChiTietEvent extends BaseEvents {
  moChiTiet: { params: { id: string }; result: void };
  dongChiTiet: { params: Record<string, never>; result: void };
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetEvents extends MoChiTietEvent {}
}
