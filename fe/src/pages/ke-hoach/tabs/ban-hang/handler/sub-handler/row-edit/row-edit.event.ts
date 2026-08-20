import { BaseEvents } from "@/common";
import type { BanHangVal } from "../init/init.state";

export interface BanHangRowEditEvent extends BaseEvents {
  /** Thêm một dòng trống. Truyền `nhomMa` để chèn thẳng vào đúng nhóm. */
  themDong: { params: { nhomMa?: string }; result: void };
  /** Gõ vào một ô. `id` là id dòng đã lưu hoặc khoá tạm của dòng mới. */
  suaO: {
    params: { id: string; patch: Partial<BanHangVal> };
    result: void;
  };
  suaThang: {
    params: { id: string; chiSo: number; giaTri: number };
    result: void;
  };
  /** Bỏ một dòng: dòng mới thì bỏ tại chỗ, dòng đã lưu thì gọi API xoá. */
  boDong: { params: { id: string }; result: void };
  huyThayDoi: { params: {}; result: void };
  luuTatCa: { params: {}; result: void };
}

declare module "../../ban-hang.handler" {
  interface BanHangEvents extends BanHangRowEditEvent {}
}
