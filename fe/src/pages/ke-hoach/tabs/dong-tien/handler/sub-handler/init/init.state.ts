import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { NhomDongTien } from "@/services/nhomDongTienService";
import type { DongTien } from "@/types";
import type {
  ChieuDongTien,
  KeHoachDongTienDong,
} from "@/services/keHoachDongTienService";
import type { DongNhap } from "../../../../lib/nhapBang";

/** Giá trị gõ được của một dòng kế hoạch dòng tiền. */
export interface DongTienVal {
  /** Mã nhóm dòng tiền — `DongTien.nhom` lưu mã chứ không lưu id. */
  nhomMa: string;
  dongTienId: string;
  /** Thu hay Chi — người lập chọn, không suy từ danh mục. */
  chieu: ChieuDongTien;
  /** Cột DIỄN GIẢI. */
  ghiChu: string;
  giaTriMucTieu: number;
  thang: number[];
}

/** Giá trị gõ được, rút từ một dòng đã lưu. */
export const valTuDong = (d: KeHoachDongTienDong): DongTienVal => ({
  nhomMa: d.nhomDongTien.ma,
  dongTienId: d.dongTien.id,
  chieu: d.chieu,
  ghiChu: d.ghiChu ?? "",
  giaTriMucTieu: d.giaTriMucTieu,
  thang: [...d.thang],
});

export interface DongTienInitStates extends BaseStates {
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  data: KeHoachDongTienDong[];
  loading: boolean;
  nhomDongTienList: NhomDongTien[];
  dongTienList: DongTien[];
  masterDataLoaded: boolean;
  /** Tồn quỹ đầu năm — nhập tay, lưu ở collection riêng. */
  tonDauNam: number;
  /** Tồn đầu năm đang gõ dở, chưa lưu. `null` = không có thay đổi. */
  tonDauNhap: number | null;
  /** Sửa đổi chưa lưu của các dòng ĐÃ LƯU, khoá theo id dòng. */
  nhap: Record<string, DongTienVal>;
  /** Dòng mới chưa lưu. */
  dongMoi: DongNhap<DongTienVal>[];
  saving: boolean;
}

declare module "../../dong-tien.handler" {
  interface DongTienStates extends DongTienInitStates {}
}
