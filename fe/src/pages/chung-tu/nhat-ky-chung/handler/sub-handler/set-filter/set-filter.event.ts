import { BaseEvents } from "@/common";
import type { NkcFilterStateKey } from "../../lib/nkcFilters";

export interface SetFilterEvent extends BaseEvents {
  setFilter: {
    params: { key: NkcFilterStateKey; value: string | undefined };
    result: void;
  };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends SetFilterEvent {}
}
