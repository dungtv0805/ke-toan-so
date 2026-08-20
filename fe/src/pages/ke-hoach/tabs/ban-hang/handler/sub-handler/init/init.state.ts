import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { NhomSanPham, SanPham } from "@/types";
import type { KeHoachBanHangDong } from "@/services/keHoachBanHangService";
import type { DongNhap } from "../../../../lib/nhapBang";

/** Giá trị gõ được của một dòng bán hàng. */
export interface BanHangVal {
  /** Mã nhóm sản phẩm — `SanPham.nhom` lưu mã chứ không lưu id. */
  nhomMa: string;
  sanPhamId: string;
  luong: number;
  giaBinhQuan: number;
  thang: number[];
}

/** Giá trị gõ được, rút từ một dòng đã lưu. */
export const valTuDong = (d: KeHoachBanHangDong): BanHangVal => ({
  nhomMa: d.nhomSanPham.ma,
  sanPhamId: d.sanPham.id,
  luong: d.luong,
  giaBinhQuan: d.giaBinhQuan,
  thang: [...d.thang],
});

export interface BanHangInitStates extends BaseStates {
  nam: number;
  data: KeHoachBanHangDong[];
  loading: boolean;
  nhomSanPhamList: NhomSanPham[];
  sanPhamList: SanPham[];
  masterDataLoaded: boolean;
  /** Sửa đổi chưa lưu của các dòng ĐÃ LƯU, khoá theo id dòng. */
  nhap: Record<string, BanHangVal>;
  /** Dòng mới chưa lưu, thêm bao nhiêu cũng được. */
  dongMoi: DongNhap<BanHangVal>[];
  saving: boolean;
}

declare module "../../ban-hang.handler" {
  interface BanHangStates extends BanHangInitStates {}
}
