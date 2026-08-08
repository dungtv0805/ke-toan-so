import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./reset.event";
import { NKC_FILTER_STATE_KEYS } from "../../lib/nkcFilters";
import { defaultDateRange } from "../init/init.handler";

@RegisterHandler("nhat-ky-chung")
export class ResetHandler extends CSubHanlder {
  @HandlerDecorator("resetFilters")
  async resetFilters(): Promise<void> {
    this.setState("searchText", "");
    // Về mặc định của màn hình (năm nay), không phải "không lọc thời gian".
    this.setState("dateRange", defaultDateRange());
    for (const key of NKC_FILTER_STATE_KEYS) {
      this.setState(key, undefined);
    }
    this.executeEvent("refresh", {});
  }
}
