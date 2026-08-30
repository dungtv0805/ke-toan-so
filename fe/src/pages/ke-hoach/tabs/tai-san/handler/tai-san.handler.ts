import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface TaiSanEvents extends BaseEvents {}

export interface TaiSanStates extends BaseStates {}

export class TaiSanHandler extends CHanlder<TaiSanEvents, TaiSanStates> {
  constructor() {
    super("ke-hoach-tai-san");
  }
}
