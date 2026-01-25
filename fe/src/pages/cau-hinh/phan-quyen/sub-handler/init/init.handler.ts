import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./init.event";

@RegisterHandler("phan-quyen-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    // Set default pagination
    this.setState("pagination", {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

    // Set default filters
    this.setState("searchText", "");
    this.setState("filterVaiTro", "all");

    // Set default UI state
    this.setState("loading", false);
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);

    // Set default data
    this.setState("nguoiDungList", []);
    this.setState("stats", null);

    // Fetch initial data
    await this.executeEvent("fetchData", {
      page: 1,
      limit: 10,
    });

    await this.executeEvent("fetchStats", {});
  }
}
