import { BaseEvents } from "@/common";
import type { NguonVonVal } from "../init/init.state";
import type { NhomNguonVon } from "@/services/keHoachNguonVonService";

export interface NguonVonRowEditEvent extends BaseEvents {
  /** Thêm một dòng trống. Truyền `nhom` để chèn thẳng vào đúng nhóm. */
  themDong: { params: { nhom?: NhomNguonVon }; result: void };
  suaO: { params: { id: string; patch: Partial<NguonVonVal> }; result: void };
  suaThang: {
    params: { id: string; chiSo: number; giaTri: number };
    result: void;
  };
  boDong: { params: { id: string }; result: void };
  huyThayDoi: { params: {}; result: void };
  luuTatCa: { params: {}; result: void };
}

declare module "../../nguon-von.handler" {
  interface NguonVonEvents extends NguonVonRowEditEvent {}
}
