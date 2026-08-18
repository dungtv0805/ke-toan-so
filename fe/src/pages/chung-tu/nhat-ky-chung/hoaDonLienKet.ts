import type { BangKeRecord } from '@/services/taxService';

/** Hóa đơn thuộc bảng kê nào. */
export type LoaiHoaDon = 'mua' | 'ban';

/** Một hóa đơn đang gắn vào chứng từ trong form. `id` rỗng = chưa có bên bảng kê. */
export interface HoaDonGan {
  id?: string;
  soHoaDon: string;
  loai: LoaiHoaDon;
  tongThanhToan?: number;
}

/**
 * Gợi ý loại hóa đơn theo loại giao dịch. Tiền ra → mua vào, tiền vào → bán ra.
 * Người dùng đổi được; đây chỉ là giá trị mặc định để bớt một cú bấm.
 */
export function suyLoaiHoaDon(loaiGiaoDich?: string): LoaiHoaDon {
  return loaiGiaoDich === 'PHIEU_THU' || loaiGiaoDich === 'BAO_CO' ? 'ban' : 'mua';
}

export function tongThanhToanHoaDon(list: HoaDonGan[]): number {
  return list.reduce((s, h) => s + (Number(h.tongThanhToan) || 0), 0);
}

/** Một hóa đơn đang THẬT SỰ gắn với chứng từ ở server (từ `layTheoSoChungTu`). */
export interface HoaDonDangGan {
  id: string;
  soHoaDon: string;
  loai: LoaiHoaDon;
}

/**
 * Hóa đơn cần gỡ liên kết khi lưu chứng từ: đang gắn ở server (nguồn sự thật)
 * nhưng không còn nằm trong danh sách hiện tại trên form — người dùng đã bỏ
 * chip ra khỏi ô. Hóa đơn mới gõ trên form (chưa có `id`) không nằm trong
 * `dangGanOServer` nên không bao giờ bị tính nhầm vào đây.
 */
export function timHoaDonCanGoLienKet(
  dangGanOServer: HoaDonDangGan[],
  danhSachHienTai: HoaDonGan[],
): HoaDonDangGan[] {
  const idHienTai = new Set(danhSachHienTai.filter((h) => h.id).map((h) => h.id));
  return dangGanOServer.filter((hd) => !idHienTai.has(hd.id));
}

/**
 * Dòng bảng kê nháp sinh từ màn chứng từ: mới có số hóa đơn, chưa có số tiền.
 * `tenNguoiBan`/`tenNguoiMua` là trường BẮT BUỘC của DTO nên phải có giá trị —
 * chứng từ chưa chọn đối tượng thì để "(Chưa xác định)", dòng vẫn mang cờ
 * choBoSung nên kế toán thuế buộc phải sửa lại khi bổ sung.
 */
export function dungDongNhap(args: {
  soHoaDon: string;
  loai: LoaiHoaDon;
  ngayChungTu: string;
  soChungTu: string;
  doiTuongTen?: string;
  doiTuongMst?: string;
}): Partial<BangKeRecord> {
  const ten = args.doiTuongTen?.trim() || '(Chưa xác định)';
  const doiTac =
    args.loai === 'mua'
      ? { tenNguoiBan: ten, mstNguoiBan: args.doiTuongMst }
      : { tenNguoiMua: ten, mstNguoiMua: args.doiTuongMst };

  return {
    ngayHoaDon: args.ngayChungTu,
    soHoaDon: args.soHoaDon.trim(),
    ...doiTac,
    giaTriChuaThue: 0,
    thueSuat: '10',
    tienThue: 0,
    tongThanhToan: 0,
    choBoSung: true,
    soChungTu: args.soChungTu,
  };
}
