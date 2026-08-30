import { BaseEvents } from "@/common";
import type { DongTienVal } from "../init/init.state";

export interface DongTienRowEditEvent extends BaseEvents {
  /** Thêm một dòng trống. Truyền `nhomMa` để chèn thẳng vào đúng nhóm. */
  themDong: { params: { nhomMa?: string }; result: void };
  /** Gõ vào một ô. `id` là id dòng đã lưu hoặc khoá tạm của dòng mới. */
  suaO: { params: { id: string; patch: Partial<DongTienVal> }; result: void };
  suaThang: {
    params: { id: string; chiSo: number; giaTri: number };
    result: void;
  };
  /** Gõ ô Tồn đầu năm — chỉ ghi vào lớp nháp, lưu cùng lần bấm Lưu. */
  suaTonDau: { params: { giaTri: number }; result: void };
  boDong: { params: { id: string }; result: void };
  huyThayDoi: { params: {}; result: void };
  luuTatCa: { params: {}; result: void };
}

declare module "../../dong-tien.handler" {
  interface DongTienEvents extends DongTienRowEditEvent {}
}
