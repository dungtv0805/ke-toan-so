import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: { loaiTruKhauHao?: boolean }; result: void };
}

declare module "../../kqkdHandler" {
  interface KqkdEvents extends InitEvent {}
}
