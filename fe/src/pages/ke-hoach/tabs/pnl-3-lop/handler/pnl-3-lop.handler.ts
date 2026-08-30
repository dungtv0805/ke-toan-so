import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface Pnl3LopEvents extends BaseEvents {}

export interface Pnl3LopStates extends BaseStates {}

export class Pnl3LopHandler extends CHanlder<Pnl3LopEvents, Pnl3LopStates> {
  constructor() {
    super("ke-hoach-pnl-3-lop");
  }
}
