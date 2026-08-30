import { BaseEvents } from "@/common";
import type { TaiSanVal } from "../init/init.state";

export interface TaiSanRowEditEvent extends BaseEvents {
  /** Thêm một dòng trống. Truyền `boPhanId` để chèn thẳng vào đúng nơi sử dụng. */
  themDong: { params: { boPhanId?: string }; result: void };
  suaO: { params: { id: string; patch: Partial<TaiSanVal> }; result: void };
  suaThang: {
    params: { id: string; chiSo: number; giaTri: number };
    result: void;
  };
  boDong: { params: { id: string }; result: void };
  huyThayDoi: { params: {}; result: void };
  luuTatCa: { params: {}; result: void };
}

declare module "../../tai-san.handler" {
  interface TaiSanEvents extends TaiSanRowEditEvent {}
}
