/**
 * Engine kết chuyển — hàm THUẦN, không đụng DB, không đụng Nest.
 *
 * Quy ước số dư dùng xuyên suốt file: **dương = dư Nợ, âm = dư Có**. Nhờ quy ước một
 * dấu này, việc chuyển số dư từ TK nguồn sang TK đích luôn là `soDu[den] += soDu[nguon]`
 * bất kể chiều nào, không phải rẽ nhánh.
 */

export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';

/** Dương = dư Nợ, âm = dư Có. */
export type BangSoDu = Record<string, number>;

export interface DongDanhMucKetChuyen {
  ma: string;
  thuTu: number;
  taiKhoanTu: string;
  taiKhoanDen: string;
  ben: BenKetChuyen;
  dienGiai?: string;
}

export interface PhatSinhTaiKhoan {
  ma: string;
  periodNo: number;
  periodCo: number;
}

export interface SoDuDauKyItem {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

export interface DongHachToan {
  maKetChuyen: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

export interface CanhBaoTonDu {
  ma: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export interface KetQuaKetChuyen {
  dong: DongHachToan[];
  canhBao: CanhBaoTonDu[];
  /** Dương = lãi, âm = lỗ. Đo tại thời điểm ngay trước bút toán chốt 911. */
  laiLo: number;
}

/** Tiền tố tài khoản thuộc kết quả kinh doanh — dùng để cảnh báo phần còn treo. */
const TIEN_TO_KQKD = ['5', '6', '7', '8', '9'];

export function dungBangSoDu(
  phatSinh: PhatSinhTaiKhoan[],
  soDuDauKy: SoDuDauKyItem[],
  apDungSoDuDauKy: boolean,
): BangSoDu {
  const bang: BangSoDu = {};

  for (const p of phatSinh) {
    const net = (Number(p.periodNo) || 0) - (Number(p.periodCo) || 0);
    bang[p.ma] = (bang[p.ma] ?? 0) + net;
  }

  if (apDungSoDuDauKy) {
    for (const o of soDuDauKy) {
      const net = (Number(o.duNo) || 0) - (Number(o.duCo) || 0);
      bang[o.maTaiKhoan] = (bang[o.maTaiKhoan] ?? 0) + net;
    }
  }

  return bang;
}

/** TK nguồn của một dòng danh mục = chính nó + mọi TK con đang có số dư. */
function timTaiKhoanNguon(bang: BangSoDu, tienTo: string): string[] {
  return Object.keys(bang)
    .filter((ma) => ma.startsWith(tienTo))
    .sort();
}

function tongSoDuNhom(bang: BangSoDu, tienTo: string): number {
  return timTaiKhoanNguon(bang, tienTo).reduce((t, ma) => t + (bang[ma] ?? 0), 0);
}

export function chayKetChuyen(
  danhMuc: DongDanhMucKetChuyen[],
  soDuBanDau: BangSoDu,
  taiKhoanXacDinhKqkd = '911',
): KetQuaKetChuyen {
  const soDu: BangSoDu = { ...soDuBanDau };
  const dong: DongHachToan[] = [];

  const theoThuTu = [...danhMuc].sort(
    (a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0) || a.ma.localeCompare(b.ma),
  );

  let laiLo = 0;
  let daDoLaiLo = false;

  for (const d of theoThuTu) {
    // Đo lãi/lỗ NGAY TRƯỚC bút toán chốt: lúc này 911 đã gom đủ doanh thu lẫn chi phí.
    if (!daDoLaiLo && d.taiKhoanTu === taiKhoanXacDinhKqkd) {
      // `|| 0` để chuẩn hoá -0 về 0: unary minus của số 0 dương cho ra -0, và
      // Object.is(-0, 0) là false nên nếu để lọt -0 ra API/FE sẽ gây so sánh sai.
      laiLo = -tongSoDuNhom(soDu, taiKhoanXacDinhKqkd) || 0;
      daDoLaiLo = true;
    }

    for (const maNguon of timTaiKhoanNguon(soDu, d.taiKhoanTu)) {
      const du = soDu[maNguon] ?? 0;
      if (du === 0) continue;

      const chieu: 'NO' | 'CO' = du > 0 ? 'NO' : 'CO';
      if (d.ben !== 'HAI_BEN' && d.ben !== chieu) continue;

      dong.push({
        maKetChuyen: d.ma,
        dienGiai: d.dienGiai ?? '',
        taiKhoanNo: chieu === 'NO' ? d.taiKhoanDen : maNguon,
        taiKhoanCo: chieu === 'NO' ? maNguon : d.taiKhoanDen,
        soTien: Math.abs(du),
      });

      soDu[d.taiKhoanDen] = (soDu[d.taiKhoanDen] ?? 0) + du;
      soDu[maNguon] = 0;
    }
  }

  // Danh mục không khai dòng 911 nào → đo lãi lỗ ở trạng thái cuối.
  // `|| 0` để chuẩn hoá -0 về 0: unary minus của số 0 dương cho ra -0, và
  // Object.is(-0, 0) là false nên nếu để lọt -0 ra API/FE sẽ gây so sánh sai.
  if (!daDoLaiLo) {
    laiLo = -tongSoDuNhom(soDu, taiKhoanXacDinhKqkd) || 0;
  }

  const canhBao: CanhBaoTonDu[] = Object.keys(soDu)
    .filter((ma) => TIEN_TO_KQKD.some((t) => ma.startsWith(t)))
    .filter((ma) => (soDu[ma] ?? 0) !== 0)
    .sort()
    .map((ma) => ({
      ma,
      soTien: Math.abs(soDu[ma]),
      ben: soDu[ma] > 0 ? ('NO' as const) : ('CO' as const),
    }));

  return { dong, canhBao, laiLo };
}
