import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface DongTienEvents extends BaseEvents {}

export interface DongTienStates extends BaseStates {}

export class DongTienHandler extends CHanlder<DongTienEvents, DongTienStates> {
  constructor() {
    super("ke-hoach-dong-tien");
  }
}
