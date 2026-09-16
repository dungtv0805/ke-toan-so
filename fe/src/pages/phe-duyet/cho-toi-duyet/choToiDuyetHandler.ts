import { CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface ChoToiDuyetEvents {}
export interface ChoToiDuyetStates extends BaseStates {}

export class ChoToiDuyetHandler extends CHanlder<
  ChoToiDuyetEvents,
  ChoToiDuyetStates
> {
  constructor() {
    super("cho-toi-duyet-context");
  }
}
