import { BaseEvents } from "@/common";

export interface PrintListEvent extends BaseEvents {
  printList: { params: { tenCongTy?: string }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends PrintListEvent {}
}
