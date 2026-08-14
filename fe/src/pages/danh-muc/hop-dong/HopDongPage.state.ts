import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { HopDong, DoiTuong, SanPham } from "@/types";

export interface HopDongPageStates extends BaseStates {
  data: HopDong[];
  loading: boolean;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  stats: {
    total: number;
    hdGoc: number;
    hdPhotoScan: number;
    chuaCoHd: number;
  };
  modalVisible: boolean;
  editingRecord: HopDong | null;
  /** Danh sách khách hàng cho ô chọn trong form (chỉ loại KHACH_HANG). */
  doiTuongList: DoiTuong[];
  /** Tra mã/tên đối tượng cho cột hiển thị — gồm MỌI loại, không chỉ khách hàng. */
  doiTuongMap: Record<string, { ma: string; ten: string }>;
  /** hopDongId → các số hóa đơn đã xuất, lấy từ Sổ hóa đơn bán ra. */
  hoaDonMap: Record<string, string[]>;
  sanPhamList: SanPham[];
}

declare module "./handler/hop-dong.handler" {
  interface HopDongStates extends HopDongPageStates {}
}
