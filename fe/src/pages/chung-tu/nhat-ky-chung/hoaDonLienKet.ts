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

/**
 * Khóa nhận diện một chip hóa đơn trong ô Select.
 *
 * KHÔNG được dùng số hóa đơn: số hóa đơn chỉ duy nhất trong phạm vi MỘT người
 * bán (spec §7.4). Hai hóa đơn trùng số của hai nhà cung cấp khác nhau gắn vào
 * cùng chứng từ sẽ bị antd gộp làm một → mất chip và tra ngược ra nhầm bản ghi.
 * Hóa đơn chưa có bên bảng kê thì chưa có id, dùng tiền tố "moi:" + loại + số.
 */
export function khoaHoaDon(h: { id?: string; soHoaDon: string; loai: LoaiHoaDon }): string {
  return h.id ? h.id : `moi:${h.loai}:${h.soHoaDon.trim()}`;
}

/** Đối tượng (tên + MST) lấy từ snapshot của một dòng chi tiết. */
interface DoiTuongSnapshot {
  ten?: string;
  mst?: string;
}

const docSnapshot = (snap?: Record<string, unknown> | null): DoiTuongSnapshot | null => {
  if (!snap) return null;
  const ten = typeof snap.ten === 'string' ? snap.ten.trim() : '';
  const mst = typeof snap.maSoThue === 'string' ? snap.maSoThue.trim() : '';
  if (!ten && !mst) return null;
  return { ten: ten || undefined, mst: mst || undefined };
};

export interface DongCoDoiTuong {
  doiTuongSnapshot?: Record<string, unknown> | null;
  doiTuong2Snapshot?: Record<string, unknown> | null;
}

/**
 * Đối tác của dòng bảng kê nháp sinh từ chứng từ.
 *
 * Hóa đơn MUA VÀO → người bán = đối tượng vế NỢ (`doiTuongSnapshot`), vì phiếu chi
 * ghi Nợ 331 / Có 111.
 * Hóa đơn BÁN RA → người mua = đối tượng vế CÓ (`doiTuong2Snapshot`), vì phiếu thu
 * ghi Nợ 111 (ngân hàng) / Có 131 (khách hàng) — lấy vế Nợ sẽ ghi TÊN NGÂN HÀNG
 * vào `tenNguoiMua`.
 * Bên ưu tiên trống thì mới lùi về bên còn lại (chứng từ nhập một vế cũng còn dùng được).
 */
export function chonDoiTuongHoaDon(
  chiTietList: DongCoDoiTuong[],
  loai: LoaiHoaDon,
): DoiTuongSnapshot {
  const list = chiTietList || [];
  const uuTien = loai === 'ban' ? 'doiTuong2Snapshot' : 'doiTuongSnapshot';
  const duPhong = loai === 'ban' ? 'doiTuongSnapshot' : 'doiTuong2Snapshot';

  for (const key of [uuTien, duPhong] as const) {
    for (const ct of list) {
      const found = docSnapshot(ct?.[key]);
      if (found) return found;
    }
  }
  return {};
}

/** Việc phải làm với một hóa đơn gõ tay (chưa chọn từ gợi ý) khi lưu chứng từ. */
export type HanhDongHoaDonMoi =
  | { kieu: 'gan'; id: string }
  | { kieu: 'tao' }
  | { kieu: 'loi'; lyDo: string };

/**
 * Gõ đúng số của một hóa đơn ĐÃ CÓ mà không kịp chọn gợi ý (gõ nhanh hơn debounce,
 * hoặc API gợi ý lỗi) thì không được đẻ dòng bảng kê trùng. Đối chiếu với bảng kê
 * trước, hợp lệ thì gắn vào dòng cũ; nhập nhằng thì báo cho người dùng.
 */
export function chonHanhDongHoaDonMoi(
  soHoaDon: string,
  daCoTrongBangKe: { id?: string; soHoaDon?: string; soChungTu?: string }[],
  soPhieu: string,
): HanhDongHoaDonMoi {
  const so = (soHoaDon || '').trim();
  const trung = (daCoTrongBangKe || []).filter(
    (r) => (r.soHoaDon || '').trim().toLowerCase() === so.toLowerCase(),
  );
  if (trung.length === 0) return { kieu: 'tao' };

  // Dòng đã gắn đúng chứng từ này thì coi như gắn lại (idempotent).
  const dungCho = trung.filter((r) => {
    const ct = (r.soChungTu || '').trim();
    return !ct || ct === soPhieu;
  });

  if (dungCho.length === 1 && dungCho[0].id) {
    return { kieu: 'gan', id: dungCho[0].id };
  }
  if (dungCho.length === 0) {
    const dangGan = [...new Set(trung.map((r) => (r.soChungTu || '').trim()))].join(', ');
    return {
      kieu: 'loi',
      lyDo: `hóa đơn ${so} đã gắn với chứng từ ${dangGan}`,
    };
  }
  return {
    kieu: 'loi',
    lyDo: `có ${dungCho.length} dòng bảng kê cùng số hóa đơn ${so} — chọn đúng dòng từ gợi ý`,
  };
}
