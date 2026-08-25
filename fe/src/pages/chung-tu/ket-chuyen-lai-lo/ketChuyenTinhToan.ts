import dayjs from 'dayjs';

export interface DongHachToan {
  maKetChuyen: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export const dinhDangTien = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

export function tongSoTien(dong: DongHachToan[]): number {
  return dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0);
}

export function dienGiaiMacDinh(denNgay: string): string {
  return `Kết chuyển lãi lỗ đến ngày ${dayjs(denNgay).format('DD/MM/YYYY')}`;
}

export function moTaCanhBao(c: CanhBaoKetChuyen): string {
  const ben = c.ben === 'NO' ? 'Nợ' : 'Có';
  return `TK ${c.ma} — ${c.ten} còn dư ${ben} ${dinhDangTien(c.soTien)} chưa được kết chuyển (chưa khai trong danh mục)`;
}

/**
 * Dòng preview kèm khoá duy nhất chỉ tồn tại trong state của form.
 *
 * `maKetChuyen` KHÔNG duy nhất: engine sinh một dòng cho MỖI tài khoản chi tiết khớp
 * tiền tố, nên khai `642 → 911` mà công ty hạch toán vào 6421 lẫn 6422 sẽ ra hai dòng
 * cùng mang mã '642-911'. Nếu lấy mã làm khoá thì sửa/xóa một dòng sẽ đụng cả hai.
 */
export interface DongHachToanCoKhoa extends DongHachToan {
  /** Chỉ dùng cho `rowKey`, sửa và xóa dòng ở FE — không nằm trong payload gửi BE. */
  khoa: string;
}

/**
 * Cấp khoá cho từng dòng preview. Chỉ số trong mảng gốc bảo đảm duy nhất tuyệt đối,
 * phần mã + cặp tài khoản giúp khoá đọc được khi debug. Khoá gán MỘT lần lúc nhận
 * preview và được giữ nguyên qua mọi lần sửa, nên React không dựng lại ô đang gõ.
 */
export function ganKhoaDong(dong: DongHachToan[]): DongHachToanCoKhoa[] {
  return dong.map((d, i) => ({
    ...d,
    khoa: `${i}|${d.maKetChuyen}|${d.taiKhoanNo}|${d.taiKhoanCo}`,
  }));
}

/** Sửa đúng MỘT dòng theo khoá, giữ nguyên khoá của dòng đó. */
export function suaDong(
  ds: DongHachToanCoKhoa[],
  khoa: string,
  patch: Partial<DongHachToan>,
): DongHachToanCoKhoa[] {
  return ds.map((d) => (d.khoa === khoa ? { ...d, ...patch } : d));
}

/** Xóa đúng MỘT dòng theo khoá. */
export function xoaDong(
  ds: DongHachToanCoKhoa[],
  khoa: string,
): DongHachToanCoKhoa[] {
  return ds.filter((d) => d.khoa !== khoa);
}

/**
 * Bỏ khoá trước khi gửi lên BE — hợp đồng API giữ nguyên đúng các field của
 * `DongKetChuyenDto` (`maKetChuyen`, `dienGiai`, `taiKhoanNo`, `taiKhoanCo`, `soTien`).
 */
export function boKhoaDong(ds: DongHachToanCoKhoa[]): DongHachToan[] {
  return ds.map(({ khoa: _khoa, ...phanConLai }) => phanConLai);
}
