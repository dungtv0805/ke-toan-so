export interface KhoanPhaiThanhToan {
  hanThanhToan?: string;
  conLai?: number;
}

export interface LichThanhToanRow {
  nhan: string;
  soKhoan: number;
  soTien: number;
}

/** Bốn mốc không chồng lấn, tính theo số ngày còn lại tới hạn. */
const MOC: { nhan: string; den: number }[] = [
  { nhan: 'Trong 7 ngày', den: 7 },
  { nhan: '8–30 ngày', den: 30 },
  { nhan: '31–60 ngày', den: 60 },
  { nhan: '61–90 ngày', den: 90 },
];

const MOT_NGAY = 24 * 60 * 60 * 1000;

/** Số ngày từ `homNay` tới `han`, cắt về mốc 0 giờ để không lệch vì giờ trong ngày. */
function soNgayConLai(han: Date, homNay: Date): number {
  const a = Date.UTC(han.getUTCFullYear(), han.getUTCMonth(), han.getUTCDate());
  const b = Date.UTC(homNay.getUTCFullYear(), homNay.getUTCMonth(), homNay.getUTCDate());
  return Math.round((a - b) / MOT_NGAY);
}

/**
 * Gom các khoản công nợ còn dư vào bốn mốc đến hạn sắp tới.
 * Khoản đã quá hạn (số ngày âm) và khoản xa hơn 90 ngày không nằm trong lịch —
 * quá hạn đã có bảng riêng, xa hơn 90 ngày chưa cần theo dõi.
 */
export function tinhLichThanhToan(
  items: KhoanPhaiThanhToan[],
  homNay: Date,
): LichThanhToanRow[] {
  const rows: LichThanhToanRow[] = MOC.map((m) => ({ nhan: m.nhan, soKhoan: 0, soTien: 0 }));

  for (const it of items) {
    const conLai = it.conLai || 0;
    if (conLai <= 0 || !it.hanThanhToan) continue;

    const han = new Date(it.hanThanhToan);
    if (Number.isNaN(han.getTime())) continue;

    const ngay = soNgayConLai(han, homNay);
    if (ngay < 0 || ngay > 90) continue;

    const idx = MOC.findIndex((m) => ngay <= m.den);
    rows[idx].soKhoan += 1;
    rows[idx].soTien += conLai;
  }

  return rows;
}
