// Tiện ích dùng chung cho tax-service.

export const THUE_RATE: Record<string, number> = {
  '0': 0,
  '5': 0.05,
  '8': 0.08,
  '10': 0.1,
  KCT: 0, // không chịu thuế
  KKKT: 0, // không kê khai khấu trừ
};

/** Tính tiền thuế GTGT (làm tròn về số nguyên đồng). */
export function tinhTienThue(giaTriChuaThue: number, thueSuat: string): number {
  const gia = Number(giaTriChuaThue) || 0;
  return Math.round(gia * (THUE_RATE[thueSuat] ?? 0));
}

/**
 * Khóa nhận diện một hóa đơn trùng: số HĐ + ký hiệu + MST đối tác.
 * Chuẩn hóa trim + viết hoa để so khớp không phân biệt hoa thường.
 * FE dựng khóa theo đúng công thức này để tô cảnh báo ở bảng xem trước.
 */
export function buildHoaDonKey(
  soHoaDon?: string,
  kyHieuHoaDon?: string,
  mst?: string,
): string {
  return [soHoaDon, kyHieuHoaDon, mst]
    .map((s) => (s ?? '').trim().toUpperCase())
    .join('|');
}

/** Khoảng ngày [start, end) của một quý trong năm. */
export function quyToRange(quy: number, nam: number): { start: Date; end: Date } {
  const startMonth = (quy - 1) * 3; // Q1→0, Q2→3, Q3→6, Q4→9
  const start = new Date(Date.UTC(nam, startMonth, 1));
  const end = new Date(Date.UTC(nam, startMonth + 3, 1));
  return { start, end };
}

/**
 * Xác định khoảng ngày lọc từ query.
 * Ưu tiên tuNgay/denNgay; nếu không có thì dùng quy+nam; chỉ nam → cả năm.
 */
export function resolveDateRange(q: {
  tuNgay?: string;
  denNgay?: string;
  quy?: number;
  nam?: number;
}): { start?: Date; end?: Date } {
  if (q.tuNgay || q.denNgay) {
    return {
      start: q.tuNgay ? new Date(q.tuNgay) : undefined,
      end: q.denNgay ? new Date(q.denNgay) : undefined,
    };
  }
  if (q.nam && q.quy) return quyToRange(q.quy, q.nam);
  if (q.nam) {
    return {
      start: new Date(Date.UTC(q.nam, 0, 1)),
      end: new Date(Date.UTC(q.nam + 1, 0, 1)),
    };
  }
  return {};
}

/** Lọc danh sách theo ngayHoaDon trong khoảng [start, end] (end là biên trên, < end). */
export function inDateRange(
  ngay: Date | string,
  range: { start?: Date; end?: Date },
): boolean {
  const d = new Date(ngay);
  if (range.start && d < range.start) return false;
  if (range.end && d >= range.end) return false;
  return true;
}

/** Bộ lọc trạng thái liên kết của một dòng bảng kê. */
export type LienKetFilter = 'da' | 'chua' | 'cho-bo-sung';

const daLienKet = (soChungTu?: string): boolean => Boolean(soChungTu?.trim());

/** Lọc bảng kê theo trạng thái liên kết chứng từ. Không truyền → giữ nguyên. */
export function locTheoLienKet<
  T extends { soChungTu?: string; choBoSung?: boolean },
>(items: T[], loc?: LienKetFilter): T[] {
  if (!loc) return items;
  if (loc === 'da') return items.filter((i) => daLienKet(i.soChungTu));
  if (loc === 'chua') return items.filter((i) => !daLienKet(i.soChungTu));
  return items.filter((i) => i.choBoSung === true);
}

/**
 * Dòng nháp sinh từ màn chứng từ mang số tiền 0. Khi kế toán thuế điền số vào
 * thì cờ chờ bổ sung phải tự tắt — bắt họ bấm thêm một nút nữa thì sẽ có dòng
 * đủ số nhưng vẫn nằm ngoài báo cáo.
 */
export function nenTatChoBoSung(v: {
  giaTriChuaThue?: number;
  tienThue?: number;
}): boolean {
  return (Number(v.giaTriChuaThue) || 0) > 0 || (Number(v.tienThue) || 0) > 0;
}

/** Gom hóa đơn theo số chứng từ. Dòng chưa liên kết bị bỏ qua. */
export function gomTheoSoChungTu<T extends { soChungTu?: string }>(
  items: T[],
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.soChungTu?.trim();
    if (!key) continue;
    (map[key] ??= []).push(item);
  }
  return map;
}

/** "PC0001, PC0002" → ['PC0001','PC0002']. Bỏ trùng và phần tử rỗng. */
export function tachDanhSachSoChungTu(q?: string): string[] {
  if (!q) return [];
  return [...new Set(q.split(',').map((s) => s.trim()).filter(Boolean))];
}

/**
 * DTO cập nhật có động tới số tiền hay không.
 *
 * `applyTotals` tính lại tiền thuế/tổng thanh toán theo công thức, nên chỉ được
 * chạy khi người dùng thật sự gửi lên số. Cập nhật từng phần (gắn/gỡ liên kết
 * chứng từ chỉ gửi `soChungTu`) mà vẫn chạy sẽ GHI ĐÈ số thuế nhập tay — hóa đơn
 * NCC hay lệch vài đồng so với công thức nên đây là mất dữ liệu thật.
 */
export function dtoCoSoTien(dto: {
  giaTriChuaThue?: number;
  thueSuat?: string;
  tienThue?: number;
  tongThanhToan?: number;
}): boolean {
  if (!dto) return false;
  return (
    dto.giaTriChuaThue !== undefined ||
    dto.thueSuat !== undefined ||
    dto.tienThue !== undefined ||
    dto.tongThanhToan !== undefined
  );
}
