import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { MucDanhMuc } from "../../../../lib/keHoachRow";
import type { DongKeHoach, QuyChuanGoiY } from "../../../lib/keHoachFormRows";

/** Thông tin dùng chung cho cả lô đang nhập. */
export interface KeHoachFormHeader {
  loaiKeHoach: LoaiKeHoach;
  phienBan?: string;
  /** Điền sẵn cho dòng mới; từng dòng vẫn sửa được ngày riêng. */
  ngayMacDinh?: string;
  /** Diễn giải chung — dòng nào bỏ trống diễn giải thì lấy cái này khi lưu. */
  dienGiaiChung?: string;
  /**
   * Loại giao dịch của cả lô. CHỈ để lọc bớt danh sách Nghiệp vụ ở bảng dưới,
   * không lưu xuống dòng kế hoạch — mỗi dòng vẫn tự mang nghiệp vụ của nó.
   */
  loaiGiaoDich?: string;
}

export interface KeHoachFormInitStates extends BaseStates {
  header: KeHoachFormHeader;
  dongList: DongKeHoach[];
  phienBanList: string[];
  loading: boolean;
  submitting: boolean;

  taiKhoanList: MucDanhMuc[];
  doiTuongList: MucDanhMuc[];
  duAnList: MucDanhMuc[];
  boPhanList: MucDanhMuc[];
  sanPhamList: MucDanhMuc[];
  dongTienList: MucDanhMuc[];
  khoanMucList: MucDanhMuc[];
  nhomQuanLyList: MucDanhMuc[];
  chuDauTuList: MucDanhMuc[];
  nhomKhoanMucList: MucDanhMuc[];
  quyChuanList: QuyChuanGoiY[];
}

declare module "../../ke-hoach-form.handler" {
  interface KeHoachFormStates extends KeHoachFormInitStates {}
}
