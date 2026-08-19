import { BaseEvents } from "@/common";
import type { Dayjs } from "dayjs";
import type { KeHoachFilterStateKey } from "../../../lib/keHoachFilters";

export interface KeHoachFilterEvent extends BaseEvents {
  search: { params: { text: string }; result: void };
  filterByDate: { params: { dates: [Dayjs, Dayjs] | null }; result: void };
  setFilter: {
    params: { key: KeHoachFilterStateKey; value?: string };
    result: void;
  };
  resetFilters: { params: {}; result: void };
  setPhienBan: { params: { phienBan?: string }; result: void };
}

declare module "../../ke-hoach.handler" {
  interface KeHoachEvents extends KeHoachFilterEvent {}
}
