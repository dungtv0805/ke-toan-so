/** Dung sai 1 đồng — số tiền lưu dạng decimal, so bằng tuyệt đối sẽ sinh chip ma. */
const DUNG_SAI = 1;

export type HanhDongDonHang =
  | 'GHI_NHAN_DOANH_THU'
  | 'KET_CHUYEN_DOANH_THU'
  | 'THU_TIEN';

export interface ChipGhiChu {
  hanhDong: HanhDongDonHang;
  nhan: string;
  /** Số tiền điền sẵn khi mở modal. */
  soTien: number;
}

export interface KetQuaGhiChu {
  /** Việc còn phải làm — mỗi chip bấm được, mở một modal đặt sẵn. */
  chips: ChipGhiChu[];
  /** Nhãn chỉ để đọc, hiện khi phần việc tương ứng đã xong. */
  nhanTinh: string[];
}

export interface SoLieuGhiChu {
  dtChuaThucHien: number;
  dtDaThucHien: number;
  /** Giá trị trước thuế của đơn hàng — mốc doanh thu phải ghi nhận. */
  mocDoanhThu: number;
  conPhaiThu: number;
}

/**
 * Cột Ghi chú của một đơn hàng: còn thiếu doanh thu thì gợi ý ghi nhận, còn 3387 treo
 * thì gợi ý kết chuyển, còn nợ thì gợi ý thu tiền. Hai điều kiện doanh thu có thể cùng
 * đúng — hiện cả hai để kế toán tự chọn việc cần làm trước.
 */
export function tinhGhiChuDonHang(r: SoLieuGhiChu): KetQuaGhiChu {
  const chips: ChipGhiChu[] = [];
  const nhanTinh: string[] = [];

  const thieuDoanhThu = r.mocDoanhThu - (r.dtChuaThucHien + r.dtDaThucHien);
  if (thieuDoanhThu > DUNG_SAI) {
    chips.push({
      hanhDong: 'GHI_NHAN_DOANH_THU',
      nhan: 'Ghi nhận doanh thu',
      soTien: thieuDoanhThu,
    });
  }

  if (r.dtChuaThucHien > DUNG_SAI) {
    chips.push({
      hanhDong: 'KET_CHUYEN_DOANH_THU',
      nhan: 'Kết chuyển doanh thu',
      soTien: r.dtChuaThucHien,
    });
  }

  if (thieuDoanhThu <= DUNG_SAI && r.dtChuaThucHien <= DUNG_SAI) {
    nhanTinh.push('Đã ghi nhận doanh thu');
  }

  if (r.conPhaiThu > DUNG_SAI) {
    chips.push({ hanhDong: 'THU_TIEN', nhan: 'Thu tiền', soTien: r.conPhaiThu });
  } else {
    nhanTinh.push('Đã thu tiền');
  }

  return { chips, nhanTinh };
}
