import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./reset.event";

@RegisterHandler("nhat-ky-chung")
export class ResetHandler extends CSubHanlder {
  @HandlerDecorator("resetFilters")
  async resetFilters(): Promise<void> {
    this.setState("searchText", "");
    this.setState("dateRange", null);
    this.setState("filterAccount", undefined);
    this.executeEvent("refresh", {});
  }
}
