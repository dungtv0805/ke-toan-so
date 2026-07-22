import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./load-refs.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import type { ImportDanhMucConfig, RefItem } from "../../types";
import type { RefData } from "../../lib/validate";

@RegisterHandler("import-danh-muc")
export class LoadRefsHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("loadRefs")
  async loadRefs(params: { config: ImportDanhMucConfig }): Promise<void> {
    const { config } = params;
    this.setState("config", config);
    this.setState("loadingRefs", true);
    try {
      const refColumns = config.columns.filter((c) => c.ref);
      const [existing, ...refLists] = await Promise.all([
        config.service.getAll(),
        ...refColumns.map((c) => c.ref!.service.getAll()),
      ]);

      const refData: RefData = {};
      refColumns.forEach((c, i) => {
        refData[c.key] = (refLists[i] ?? []) as RefItem[];
      });

      this.setState("existing", existing ?? []);
      this.setState("refData", refData);
      this.setState("refsLoaded", true);
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Không tải được dữ liệu danh mục");
    } finally {
      this.setState("loadingRefs", false);
    }
  }
}
