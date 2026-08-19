import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface KeHoachFormEvents extends BaseEvents {}

export interface KeHoachFormStates extends BaseStates {}

export class KeHoachFormHandler extends CHanlder<KeHoachFormEvents, KeHoachFormStates> {
  constructor() {
    super("ke-hoach-form");
  }
}
