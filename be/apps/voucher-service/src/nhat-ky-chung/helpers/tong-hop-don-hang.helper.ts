/** TK tiền — Nợ vào đây là một lần thu tiền của đơn hàng. */
export const TK_TIEN = ['111', '112'];
/** Doanh thu chưa thực hiện. */
export const TK_CHUA_THUC_HIEN = '3387';
/** Doanh thu đã thực hiện. */
export const TK_DOANH_THU = '511';

const num = (v: unknown): number => Number(v) || 0;
const laTk = (ma: string | undefined, prefix: string) => Boolean(ma?.startsWith(prefix));

/** Một bút toán đã rút gọn về đúng các trường cần cho tổng hợp. */
export interface DongHachToan {
  ngay?: Date | string;
  soTien?: number;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soHopDong?: string;
  sanPhamMa?: string;
  sanPhamTen?: string;
}

export interface TongHopDonHang {
  soHopDong: string;
  /** Σ Nợ 111* + Nợ 112*, luỹ kế toàn thời gian. */
  daThu: number;
  /** max(0, Σ Có 3387* − Σ Nợ 3387*), luỹ kế. */
  dtChuaThucHien: number;
  /** Σ Có 511*, luỹ kế. */
  dtDaThucHien: number;
  /** Σ Có 511* theo tháng, chỉ các chứng từ trong năm được hỏi. 12 phần tử. */
  dtTheoThang: number[];
}

export interface DoanhThuKhongDon {
  sanPhamMa: string;
  sanPhamTen: string;
  dtTheoThang: number[];
}

const thangCuaNam = (ngay: Date | string | undefined, nam: number): number | null => {
  if (!ngay) return null;
  const d = ngay instanceof Date ? ngay : new Date(ngay);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear() === nam ? d.getUTCMonth() : null;
};

/**
 * Gom bút toán theo đơn hàng: tiền đã thu, doanh thu chưa/đã thực hiện, và doanh thu
 * theo từng tháng của năm được hỏi.
 *
 * Ba số luỹ kế cố ý KHÔNG cắt theo năm — "còn phải thu" của một đơn hàng là số của cả
 * đời đơn hàng đó, cắt theo kỳ thì sai. Chỉ `dtTheoThang` giới hạn trong `nam`.
 *
 * Dòng Có 511 không gắn đơn hàng vẫn được giữ, gom theo mã sản phẩm, để bảng doanh thu
 * theo sản phẩm không bị hụt so với sổ cái 511.
 */
export function gomTongHopDonHang(
  rows: DongHachToan[],
  nam: number,
): { theoDonHang: TongHopDonHang[]; khongCoDonHang: DoanhThuKhongDon[] } {
  const theoDon = new Map<string, TongHopDonHang>();
  const treoNo = new Map<string, number>();
  const khongDon = new Map<string, DoanhThuKhongDon>();

  for (const r of rows) {
    const tien = num(r.soTien);
    const thang = thangCuaNam(r.ngay, nam);
    const laDoanhThu = laTk(r.taiKhoanCo, TK_DOANH_THU);

    if (!r.soHopDong) {
      if (!laDoanhThu) continue;
      const ma = r.sanPhamMa || '';
      const cur: DoanhThuKhongDon = khongDon.get(ma) ?? {
        sanPhamMa: ma,
        sanPhamTen: r.sanPhamTen || '',
        dtTheoThang: Array(12).fill(0) as number[],
      };
      if (thang != null) cur.dtTheoThang[thang] += tien;
      khongDon.set(ma, cur);
      continue;
    }

    const cur: TongHopDonHang = theoDon.get(r.soHopDong) ?? {
      soHopDong: r.soHopDong,
      daThu: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      dtTheoThang: Array(12).fill(0) as number[],
    };

    if (TK_TIEN.some((p) => laTk(r.taiKhoanNo, p))) cur.daThu += tien;
    if (laTk(r.taiKhoanCo, TK_CHUA_THUC_HIEN)) cur.dtChuaThucHien += tien;
    if (laTk(r.taiKhoanNo, TK_CHUA_THUC_HIEN)) {
      treoNo.set(r.soHopDong, (treoNo.get(r.soHopDong) || 0) + tien);
    }
    if (laDoanhThu) {
      cur.dtDaThucHien += tien;
      if (thang != null) cur.dtTheoThang[thang] += tien;
    }

    theoDon.set(r.soHopDong, cur);
  }

  for (const [so, don] of theoDon) {
    don.dtChuaThucHien = Math.max(0, don.dtChuaThucHien - (treoNo.get(so) || 0));
  }

  return {
    theoDonHang: [...theoDon.values()],
    khongCoDonHang: [...khongDon.values()],
  };
}
