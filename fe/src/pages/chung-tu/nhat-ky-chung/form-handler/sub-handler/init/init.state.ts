import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, QuyChuan, NhomKhuyenMai, NhomQuanLy } from "@/types";
import { LoaiChungTuType } from "@/services/loaiChungTuService";
import { Dayjs } from "dayjs";

export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface KhoanMucItem {
  id: string;
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

// Header chứng từ (thông tin chung)
export interface ChungTuHeader {
  soPhieu?: string;
  ngay: Dayjs;
  loai?: string;
  loaiTen?: string;
  dienGiaiChung?: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
}

// Chi tiết từng dòng
export interface ChungTuChiTiet {
  key: string;
  id?: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
  noiDung?: string;

  // Phân bổ
  doiTuongId?: string;
  doiTuong2Id?: string;
  duAnId?: string;
  boPhanId?: string;
  doiId?: string;
  nhanVienId?: string;
  sanPhamId?: string;
  dongTienId?: string;
  nhomKhuyenMaiId?: string;
  nhomQuanLyId?: string;
  khoanMucId?: string;

  // Snapshots
  doiTuongSnapshot?: Record<string, unknown>;
  doiTuong2Snapshot?: Record<string, unknown>;
  duAnSnapshot?: Record<string, unknown>;
  boPhanSnapshot?: Record<string, unknown>;
  doiSnapshot?: Record<string, unknown>;
  nhanVienSnapshot?: Record<string, unknown>;
  sanPhamSnapshot?: Record<string, unknown>;
  dongTienSnapshot?: Record<string, unknown>;
  nhomKhuyenMaiSnapshot?: Record<string, unknown>;
  nhomQuanLySnapshot?: Record<string, unknown>;
  khoanMucSnapshot?: Record<string, unknown>;
}

export interface InitFormStates extends BaseStates {
  // Header
  header: ChungTuHeader | null;

  // Chi tiết - danh sách các dòng
  chiTietList: ChungTuChiTiet[];

  // Master data
  taiKhoanList: TaiKhoanItem[];
  khoanMucList: KhoanMucItem[];
  doiTuongList: DoiTuong[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  quyChaunList: QuyChuan[];
  loaiChungTuList: LoaiChungTuType[];
  nhomKhuyenMaiList: NhomKhuyenMai[];
  nhomQuanLyList: NhomQuanLy[];

  // UI state
  loading: boolean;
  submitting: boolean;
  isEditing: boolean;
  masterDataLoaded: boolean;
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormStates extends InitFormStates {}
}
