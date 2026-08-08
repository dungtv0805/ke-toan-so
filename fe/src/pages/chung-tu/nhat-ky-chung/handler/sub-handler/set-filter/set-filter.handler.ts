import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./set-filter.event";
import type { NkcFilterStateKey } from "../../lib/nkcFilters";
import type { PaginationMeta } from "../init/init.state";

/**
 * Đổi một tiêu chí trên hàng lọc → về trang 1 rồi nạp lại danh sách + số liệu
 * tổng quan. Dùng chung cho cả 14 dropdown nên không cần mỗi tiêu chí một handler.
 */
@RegisterHandler("nhat-ky-chung")
export class SetFilterHandler extends CSubHanlder {
  @HandlerDecorator("setFilter")
  async setFilter(params: {
    key: NkcFilterStateKey;
    value: string | undefined;
  }): Promise<void> {
    this.setState(params.key, params.value);
    const pagination = this.getState("pagination") as
      | PaginationMeta
      | undefined;
    if (pagination) {
      this.setState("pagination", { ...pagination, page: 1 });
    }
    this.executeEvent("refresh", {});
  }
}
