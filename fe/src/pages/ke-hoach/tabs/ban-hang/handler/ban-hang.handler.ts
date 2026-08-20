import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface BanHangEvents extends BaseEvents {}

export interface BanHangStates extends BaseStates {}

export class BanHangHandler extends CHanlder<BanHangEvents, BanHangStates> {
  constructor() {
    super("ke-hoach-ban-hang");
  }
}
