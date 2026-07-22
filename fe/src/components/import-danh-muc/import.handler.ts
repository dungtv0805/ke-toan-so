import { BaseEvents, CHanlder } from "@/common";
import "./sub-handler";
import { ImportDanhMucStates } from "./import.state";

export interface ImportDanhMucEvents extends BaseEvents {}

export class ImportDanhMucHandler extends CHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  constructor() {
    super("import-danh-muc");
  }
}
