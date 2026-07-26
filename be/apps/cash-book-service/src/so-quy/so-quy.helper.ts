import type { NhatKyChungEntry } from '@app/dto';

/**
 * Sổ quỹ = biến động của các TK tiền (111 tiền mặt, 112 tiền gửi) gồm cả TK con.
 * Ghi Nợ TK tiền → THU, ghi Có TK tiền → CHI.
 *
 * Quy tắc này ĐỒNG NHẤT với `getCashFlowSeries` (voucher-service) và với sổ chi
 * tiết TK (reporting-service). Bản cũ phân loại theo `loai` chứng từ
 * (PHIEU_THU = thu, còn lại = chi) nên mọi bút toán nhật ký chung — kể cả bút
 * toán không đụng tới tiền — đều bị tính vào cột Chi.
 */
const CASH_ACCOUNT = /^11[12]/;

export function isCashAccount(ma?: string): boolean {
  return !!ma && CASH_ACCOUNT.test(ma);
}

/** Dòng số dư đầu kỳ nhập tay (master-data /so-du-dau-ky). */
export interface OpeningRow {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

export interface SoQuyEntry {
  ngay: Date;
  soPhieu: string;
  noiDung: string;
  thu: number;
  chi: number;
  soDu: number;
}

export interface SoQuyResult {
  tonDauKy: number;
  entries: SoQuyEntry[];
  tongThu: number;
  tongChi: number;
  tonCuoiKy: number;
  soPhieuThu: number;
  soPhieuChi: number;
}

function tkNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}
function tkCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

/**
 * Các vế tiền của một chứng từ. Bút toán chuyển quỹ (Nợ 112 / Có 111) đụng tiền
 * ở cả hai vế nên sinh 2 dòng — tổng quỹ không đổi nhưng sổ vẫn ghi nhận đủ.
 */
export function cashLegsOf(v: NhatKyChungEntry): Array<{ thu: number; chi: number }> {
  const soTien = Number(v.soTien) || 0;
  const legs: Array<{ thu: number; chi: number }> = [];
  if (isCashAccount(tkNo(v))) legs.push({ thu: soTien, chi: 0 });
  if (isCashAccount(tkCo(v))) legs.push({ thu: 0, chi: soTien });
  return legs;
}

/** Số dư tiền đầu kỳ nhập tay: Σ(duNo − duCo) của các TK 111/112. */
export function sumOpeningCash(opening: OpeningRow[]): number {
  let total = 0;
  for (const o of opening) {
    if (!isCashAccount(o.maTaiKhoan)) continue;
    total += (Number(o.duNo) || 0) - (Number(o.duCo) || 0);
  }
  return total;
}

/**
 * Dựng sổ quỹ trong khoảng [startDate, endDate] (bỏ trống = toàn bộ thời gian).
 *
 * Tồn đầu kỳ = số dư nhập tay + phát sinh tiền TRƯỚC startDate — cùng công thức
 * với `buildSoChiTiet` của reporting-service để hai báo cáo luôn khớp nhau.
 */
export function buildSoQuy(
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  startDate?: Date,
  endDate?: Date,
): SoQuyResult {
  const from = startDate ? startDate.getTime() : -Infinity;
  const to = endDate ? endDate.getTime() : Infinity;

  let tonDauKy = sumOpeningCash(opening);
  const inPeriod: Array<{ v: NhatKyChungEntry; t: number }> = [];

  for (const v of vouchers) {
    const t = new Date(v.ngay).getTime();
    if (Number.isNaN(t)) continue;
    if (t < from) {
      for (const leg of cashLegsOf(v)) tonDauKy += leg.thu - leg.chi;
      continue;
    }
    if (t > to) continue;
    inPeriod.push({ v, t });
  }

  inPeriod.sort((a, b) => a.t - b.t || a.v.soPhieu.localeCompare(b.v.soPhieu));

  let soDu = tonDauKy;
  let tongThu = 0;
  let tongChi = 0;
  let soPhieuThu = 0;
  let soPhieuChi = 0;
  const entries: SoQuyEntry[] = [];

  for (const { v, t } of inPeriod) {
    for (const leg of cashLegsOf(v)) {
      soDu += leg.thu - leg.chi;
      tongThu += leg.thu;
      tongChi += leg.chi;
      if (leg.thu > 0) soPhieuThu++;
      if (leg.chi > 0) soPhieuChi++;
      entries.push({
        ngay: new Date(t),
        soPhieu: v.soPhieu,
        noiDung: v.noiDung,
        thu: leg.thu,
        chi: leg.chi,
        soDu,
      });
    }
  }

  return {
    tonDauKy,
    entries,
    tongThu,
    tongChi,
    tonCuoiKy: soDu,
    soPhieuThu,
    soPhieuChi,
  };
}
