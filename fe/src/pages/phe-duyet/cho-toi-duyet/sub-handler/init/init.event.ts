import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  taiLaiDanhSach: { params: Record<string, never>; result: void };
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetEvents extends InitEvent {}
}
