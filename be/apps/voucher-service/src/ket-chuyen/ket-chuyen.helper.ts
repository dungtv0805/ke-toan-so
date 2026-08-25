import type { ChungTu } from '@app/entities';

export interface LoKetChuyen {
  soPhieu: string;
  ngay: Date;
  dienGiai: string;
  tongTien: number;
  soDong: number;
  /** Dương = lãi, âm = lỗ. */
  laiLo: number;
  nguoiTaoId?: string;
}

interface DongToiThieu {
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soTien: number;
}

const LA_TAI_KHOAN_KQKD = (ma?: string) =>
  !!ma && ['5', '6', '7', '8', '9'].some((t) => ma.startsWith(t));

/**
 * Bút toán chốt lãi/lỗ là dòng có 911 ở một bên và bên kia KHÔNG phải tài khoản
 * kết quả kinh doanh (thường là 421x). Nhận diện theo hình dạng bút toán nên không
 * cần lưu thêm cờ vào chứng từ.
 */
export function tinhLaiLoTuDong(dong: DongToiThieu[], taiKhoan911 = '911'): number {
  for (const d of dong) {
    const no = d.taiKhoanNo;
    const co = d.taiKhoanCo;

    if (no?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(co)) {
      return d.soTien;
    }
    if (co?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(no)) {
      return -d.soTien;
    }
  }
  return 0;
}

export function gomLoKetChuyen(rows: ChungTu[]): LoKetChuyen[] {
  const theoSoPhieu = new Map<string, ChungTu[]>();

  for (const r of rows) {
    const arr = theoSoPhieu.get(r.soPhieu) ?? [];
    arr.push(r);
    theoSoPhieu.set(r.soPhieu, arr);
  }

  const lo: LoKetChuyen[] = [];

  for (const [soPhieu, dong] of theoSoPhieu) {
    const dauTien = dong[0];
    lo.push({
      soPhieu,
      ngay: dauTien.ngay,
      dienGiai: dauTien.ghiChu || dauTien.noiDung,
      tongTien: dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0),
      soDong: dong.length,
      laiLo: tinhLaiLoTuDong(
        dong.map((d) => ({
          taiKhoanNo: d.danhMuc?.taiKhoanNo?.ma,
          taiKhoanCo: d.danhMuc?.taiKhoanCo?.ma,
          soTien: Number(d.soTien) || 0,
        })),
      ),
      nguoiTaoId: dauTien.nguoiTaoId,
    });
  }

  return lo.sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime());
}
