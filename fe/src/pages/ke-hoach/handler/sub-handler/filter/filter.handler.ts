import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import type { Dayjs } from "dayjs";
import type { KeHoachEvents, KeHoachStates } from "../../ke-hoach.handler";
import {
  KE_HOACH_FILTER_STATE_KEYS,
  type KeHoachFilterStateKey,
} from "../../../lib/keHoachFilters";
import { defaultDateRange } from "../init/init.handler";
import "./filter.event";

@RegisterHandler("ke-hoach")
export class KeHoachFilterHandler extends CSubHanlder<KeHoachEvents, KeHoachStates> {
  @HandlerDecorator("search")
  async search(params: { text: string }): Promise<void> {
    this.setState("searchText", params.text);
    await this.executeEvent("refresh", {});
  }

  @HandlerDecorator("filterByDate")
  async filterByDate(params: { dates: [Dayjs, Dayjs] | null }): Promise<void> {
    this.setState("dateRange", params.dates ?? defaultDateRange());
    await this.executeEvent("refresh", {});
  }

  @HandlerDecorator("setFilter")
  async setFilter(params: {
    key: KeHoachFilterStateKey;
    value?: string;
  }): Promise<void> {
    this.setState(params.key, params.value);
    await this.executeEvent("refresh", {});
  }

  @HandlerDecorator("setPhienBan")
  async setPhienBan(params: { phienBan?: string }): Promise<void> {
    this.setState("phienBan", params.phienBan);
    await this.executeEvent("refresh", {});
  }

  /** Xóa mọi tiêu chí, kỳ về mặc định (năm nay) — giống nút xóa lọc của chứng từ. */
  @HandlerDecorator("resetFilters")
  async resetFilters(): Promise<void> {
    this.setState("searchText", "");
    this.setState("phienBan", undefined);
    this.setState("dateRange", defaultDateRange());
    for (const key of KE_HOACH_FILTER_STATE_KEYS) this.setState(key, undefined);
    await this.executeEvent("refresh", {});
  }
}
