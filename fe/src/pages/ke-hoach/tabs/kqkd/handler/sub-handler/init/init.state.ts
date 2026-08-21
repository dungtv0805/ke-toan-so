import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { HangKqkd } from "../../../lib/kqkdKeHoachRows";

export interface KqkdInitStates extends BaseStates {
  nam: number;
  hang: HangKqkd[];
  loading: boolean;
}

declare module "../../kqkd.handler" {
  interface KqkdStates extends KqkdInitStates {}
}
