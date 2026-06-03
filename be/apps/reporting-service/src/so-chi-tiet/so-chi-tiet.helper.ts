import type { NhatKyChungEntry } from '@app/dto';

/**
 * Tập mã TK liên quan: chính nó + mọi TK con cháu (theo tiền tố mã).
 * Đồng nhất quy tắc với buildSoDuTree của FE.
 */
export function computeRelevantCodes(
  accounts: Array<{ ma: string }>,
  maTaiKhoan: string,
): Set<string> {
  const set = new Set<string>();
  for (const a of accounts) {
    if (a.ma === maTaiKhoan || a.ma.startsWith(maTaiKhoan)) {
      set.add(a.ma);
    }
  }
  set.add(maTaiKhoan);
  return set;
}

export interface SoChiTietRow {
  ngay: Date;
  soPhieu: string;
  ngayChungTu: Date;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

export interface OpeningRow {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietMa?: string;
}

function getTkNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}
function getTkCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

/** Tách số dư có dấu thành cặp Nợ/Có theo loại tài khoản. */
function splitBalance(
  signed: number,
  loai: string,
): { no: number; co: number } {
  if (loai === 'NO') {
    return signed >= 0 ? { no: signed, co: 0 } : { no: 0, co: -signed };
  }
  return signed >= 0 ? { no: 0, co: signed } : { no: -signed, co: 0 };
}

/**
 * Build sổ chi tiết tài khoản.
 * - account: TK đã chọn (cha hoặc leaf), quyết định loai để tính số dư.
 * - relevantCodes: tập mã TK gộp (computeRelevantCodes).
 * - opening: các dòng số dư đầu kỳ nhập tay (đã có chiTietMa).
 * - maDoiTuong: lọc theo đối tượng (tùy chọn).
 */
export function buildSoChiTiet(
  account: { ma: string; ten: string; loai: string },
  relevantCodes: Set<string>,
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
): SoChiTietReport {
  const loai = account.loai;

  const legsOf = (
    v: NhatKyChungEntry,
  ): Array<{ no: number; co: number; tkDoiUng: string }> => {
    const objMa = v.danhMuc?.doiTuong?.ma;
    if (maDoiTuong && objMa !== maDoiTuong) return [];
    const tkNo = getTkNo(v);
    const tkCo = getTkCo(v);
    const out: Array<{ no: number; co: number; tkDoiUng: string }> = [];
    if (relevantCodes.has(tkNo)) {
      out.push({ no: v.soTien, co: 0, tkDoiUng: tkCo });
    }
    if (relevantCodes.has(tkCo)) {
      out.push({ no: 0, co: v.soTien, tkDoiUng: tkNo });
    }
    return out;
  };

  const delta = (no: number, co: number) =>
    loai === 'NO' ? no - co : co - no;

  // 1) Số dư đầu kỳ nhập tay
  let manualSigned = 0;
  for (const o of opening) {
    if (!relevantCodes.has(o.maTaiKhoan)) continue;
    if (maDoiTuong && o.chiTietMa !== maDoiTuong) continue;
    manualSigned += delta(Number(o.duNo) || 0, Number(o.duCo) || 0);
  }

  // 2) Phát sinh trước kỳ → cộng vào đầu kỳ
  let priorSigned = 0;
  for (const v of vouchers) {
    if (new Date(v.ngay).getTime() >= startDate.getTime()) continue;
    for (const leg of legsOf(v)) priorSigned += delta(leg.no, leg.co);
  }

  const soDuDauKySigned = manualSigned + priorSigned;

  // 3) Phát sinh trong kỳ
  const periodVouchers = vouchers
    .filter((v) => {
      const t = new Date(v.ngay).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    })
    .sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime());

  let soDu = soDuDauKySigned;
  let tongPhatSinhNo = 0;
  let tongPhatSinhCo = 0;
  const rows: SoChiTietRow[] = [];

  for (const v of periodVouchers) {
    for (const leg of legsOf(v)) {
      soDu += delta(leg.no, leg.co);
      tongPhatSinhNo += leg.no;
      tongPhatSinhCo += leg.co;
      const s = splitBalance(soDu, loai);
      rows.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        ngayChungTu: new Date(v.ngay),
        noiDung: v.noiDung,
        tkDoiUng: leg.tkDoiUng,
        phatSinhNo: leg.no,
        phatSinhCo: leg.co,
        soDuNo: s.no,
        soDuCo: s.co,
      });
    }
  }

  const dauKy = splitBalance(soDuDauKySigned, loai);
  const cuoiKy = splitBalance(soDu, loai);

  return {
    taiKhoan: { ma: account.ma, ten: account.ten, loai },
    soDuDauKyNo: dauKy.no,
    soDuDauKyCo: dauKy.co,
    rows,
    tongPhatSinhNo,
    tongPhatSinhCo,
    soDuCuoiKyNo: cuoiKy.no,
    soDuCuoiKyCo: cuoiKy.co,
  };
}
