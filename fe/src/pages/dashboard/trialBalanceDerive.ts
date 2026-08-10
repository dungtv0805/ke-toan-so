import type { TrialBalance } from '@/services/soCaiService';

/** TK tiền mặt + tiền gửi ngân hàng. Không gồm 113 (tiền đang chuyển). */
const PREFIX_TIEN = ['111', '112'];
const PREFIX_TON_KHO = ['15'];
const PREFIX_PHAI_THU = ['131', '136', '138'];
const PREFIX_PHAI_TRA = ['331', '336', '338'];

export interface TienTheoTaiKhoanRow {
  ma: string;
  ten: string;
  duDauKy: number;
  phatSinhNo: number;
  phatSinhCo: number;
  duCuoiKy: number;
}

export interface DoiChieuRow {
  doiTuong: string;
  duDauKy: number;
  phatSinhTang: number;
  phatSinhGiam: number;
  duCuoiKy: number;
}

const thuocNhom = (ma: string, prefixes: string[]): boolean =>
  prefixes.some((p) => ma.startsWith(p));

const duCuoiNet = (r: TrialBalance): number => (r.soDuCuoiKyNo || 0) - (r.soDuCuoiKyCo || 0);

/** Tổng tiền cuối kỳ = Σ số dư cuối của TK 111/112 (đã gồm tồn đầu kỳ). */
export function tongTien(tb: TrialBalance[]): number {
  return tb
    .filter((r) => thuocNhom(r.taiKhoan, PREFIX_TIEN))
    .reduce((s, r) => s + duCuoiNet(r), 0);
}

/** Giá trị tồn kho = Σ số dư cuối của các TK hàng tồn kho (15x). */
export function giaTriTonKho(tb: TrialBalance[]): number {
  return tb
    .filter((r) => thuocNhom(r.taiKhoan, PREFIX_TON_KHO))
    .reduce((s, r) => s + duCuoiNet(r), 0);
}

/** TK tiền và chi tiết từng quỹ/ngân hàng, TK cha đứng ngay trước các dòng con. */
export function tienTheoTaiKhoan(tb: TrialBalance[]): TienTheoTaiKhoanRow[] {
  const toRow = (r: TrialBalance): TienTheoTaiKhoanRow => ({
    ma: r.taiKhoan,
    ten: r.tenTaiKhoanNH || r.tenTaiKhoan || r.taiKhoan,
    duDauKy: (r.soDuDauKyNo || 0) - (r.soDuDauKyCo || 0),
    phatSinhNo: r.phatSinhNo || 0,
    phatSinhCo: r.phatSinhCo || 0,
    duCuoiKy: duCuoiNet(r),
  });

  const out: TienTheoTaiKhoanRow[] = [];
  for (const r of tb) {
    if (!thuocNhom(r.taiKhoan, PREFIX_TIEN)) continue;
    out.push(toRow(r));
    for (const con of r.doiTuongChiTiet ?? []) out.push(toRow(con));
  }
  return out;
}

/**
 * Bảng đối chiếu công nợ theo đối tượng.
 * - 'thu': TK phải thu, tăng = phát sinh Nợ, số dư lấy bên Nợ
 * - 'tra': TK phải trả, tăng = phát sinh Có, số dư lấy bên Có
 * Một đối tượng (gộp theo MÃ, không theo tên hiển thị) nằm ở nhiều tài khoản
 * được gộp thành một dòng — tên hiển thị lấy từ lần xuất hiện đầu tiên.
 */
export function doiChieuCongNo(tb: TrialBalance[], loai: 'thu' | 'tra'): DoiChieuRow[] {
  const prefixes = loai === 'thu' ? PREFIX_PHAI_THU : PREFIX_PHAI_TRA;
  const gop = new Map<string, DoiChieuRow>();

  for (const acc of tb) {
    if (!thuocNhom(acc.taiKhoan, prefixes)) continue;
    for (const dt of acc.doiTuongChiTiet ?? []) {
      const ma = dt.taiKhoan;
      const row = gop.get(ma) ?? {
        doiTuong: dt.tenTaiKhoan || dt.taiKhoan,
        duDauKy: 0,
        phatSinhTang: 0,
        phatSinhGiam: 0,
        duCuoiKy: 0,
      };
      if (loai === 'thu') {
        row.duDauKy += dt.soDuDauKyNo || 0;
        row.phatSinhTang += dt.phatSinhNo || 0;
        row.phatSinhGiam += dt.phatSinhCo || 0;
        row.duCuoiKy += dt.soDuCuoiKyNo || 0;
      } else {
        row.duDauKy += dt.soDuDauKyCo || 0;
        row.phatSinhTang += dt.phatSinhCo || 0;
        row.phatSinhGiam += dt.phatSinhNo || 0;
        row.duCuoiKy += dt.soDuCuoiKyCo || 0;
      }
      gop.set(ma, row);
    }
  }

  return Array.from(gop.values()).sort((a, b) => b.duCuoiKy - a.duCuoiKy);
}
