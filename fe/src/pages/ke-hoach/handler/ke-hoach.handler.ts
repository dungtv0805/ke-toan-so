import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface KeHoachEvents extends BaseEvents {}

export interface KeHoachStates extends BaseStates {}

export class KeHoachHandler extends CHanlder<KeHoachEvents, KeHoachStates> {
  constructor() {
    super("ke-hoach");
  }
}
