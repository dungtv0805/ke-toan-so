import { BaseEvents } from "@/common";

export interface KqkdInitEvent extends BaseEvents {
  init: { params: { nam: number; phienBan?: string }; result: void };
}

declare module "../../kqkd.handler" {
  interface KqkdEvents extends KqkdInitEvent {}
}
