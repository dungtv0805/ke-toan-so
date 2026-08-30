import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NguonVonEvents extends BaseEvents {}

export interface NguonVonStates extends BaseStates {}

export class NguonVonHandler extends CHanlder<NguonVonEvents, NguonVonStates> {
  constructor() {
    super("ke-hoach-nguon-von");
  }
}
