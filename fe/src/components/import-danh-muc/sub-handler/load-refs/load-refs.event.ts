import { BaseEvents } from "@/common";
import type { ImportDanhMucConfig } from "../../types";

export interface LoadRefsEvent extends BaseEvents {
  loadRefs: { params: { config: ImportDanhMucConfig }; result: void };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends LoadRefsEvent {}
}
