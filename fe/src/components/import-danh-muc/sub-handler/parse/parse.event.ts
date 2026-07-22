import { BaseEvents } from "@/common";

export interface ParseEvent extends BaseEvents {
  parseFile: { params: { file: File }; result: void };
  resetImport: { params: Record<string, never>; result: void };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends ParseEvent {}
}
