import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface NhanSuEvents extends BaseEvents {}

export interface NhanSuStates extends BaseStates {}

export class NhanSuHandler extends CHanlder<NhanSuEvents, NhanSuStates> {
  constructor() {
    super("ke-hoach-nhan-su");
  }
}
