import type { NhatKyChungEntry } from '@app/dto';
import {
  KHONG_GAN_DON_HANG,
  buildDoanhThuReport,
  isDoanhThuEntry,
} from './doanh-thu.helper';

interface EntryInput {
  ngay: string;
  soTien: number;
  taiKhoanCo: string;
  soHopDong?: string;
  tenCongTrinh?: string;
  giaTriSauThue?: number;
  khachHang?: string;
  sanPham?: string;
}

const entry = (e: EntryInput): NhatKyChungEntry =>
  ({
    soPhieu: 'NK001/2026',
    ngay: new Date(e.ngay),
    soTien: e.soTien,
    danhMuc: {
      taiKhoanNo: { ma: '3387' },
      taiKhoanCo: { ma: e.taiKhoanCo },
      ...(e.soHopDong
        ? {
            hopDong: {
              soHopDong: e.soHopDong,
              tenCongTrinh: e.tenCongTrinh,
              giaTriSauThue: e.giaTriSauThue,
            },
          }
        : {}),
      ...(e.khachHang ? { doiTuong2: { ten: e.khachHang } } : {}),
      ...(e.sanPham ? { sanPham: { ten: e.sanPham } } : {}),
    },
  }) as unknown as NhatKyChungEntry;

describe('isDoanhThuEntry', () => {
  it('nhận mọi TK con của 511', () => {
    expect(isDoanhThuEntry(entry({ ngay: '2026-01-10', soTien: 1, taiKhoanCo: '5113' }))).toBe(true);
  });

  it('bỏ qua TK khác', () => {
    expect(isDoanhThuEntry(entry({ ngay: '2026-01-10', soTien: 1, taiKhoanCo: '3387' }))).toBe(false);
  });
});

describe('buildDoanhThuReport', () => {
  it('gom theo đơn hàng và rải doanh thu vào đúng tháng chứng từ', () => {
    const { rows } = buildDoanhThuReport([
      entry({
        ngay: '2026-01-15',
        soTien: 75_336_473,
        taiKhoanCo: '511',
        soHopDong: 'DH03',
        tenCongTrinh: 'Business in the Box',
        giaTriSauThue: 81_363_391,
        khachHang: 'NGUYỄN THỊ YẾN',
        sanPham: 'Business in the Box',
      }),
      entry({
        ngay: '2026-04-02',
        soTien: 1_643_334,
        taiKhoanCo: '511',
        soHopDong: 'DH05',
        giaTriSauThue: 1_774_801,
        khachHang: 'PAPASAN VN',
      }),
    ]);

    expect(rows).toHaveLength(2);
    const dh03 = rows.find((r) => r.soHopDong === 'DH03')!;
    expect(dh03.doanhThu).toBe(75_336_473);
    expect(dh03.doanhSo).toBe(81_363_391);
    expect(dh03.khachHang).toBe('NGUYỄN THỊ YẾN');
    expect(dh03.sanPham).toBe('Business in the Box');
    expect(dh03.thang[0]).toBe(75_336_473);
    expect(dh03.thang[3]).toBe(0);

    expect(rows.find((r) => r.soHopDong === 'DH05')!.thang[3]).toBe(1_643_334);
  });

  it('nhiều lần ghi nhận của một đơn hàng cộng dồn theo từng tháng', () => {
    const { rows, tong } = buildDoanhThuReport([
      entry({ ngay: '2026-07-01', soTien: 40_000_000, taiKhoanCo: '511', soHopDong: 'DH08', giaTriSauThue: 93_733_000 }),
      entry({ ngay: '2026-09-01', soTien: 46_789_814, taiKhoanCo: '5113', soHopDong: 'DH08', giaTriSauThue: 93_733_000 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].doanhThu).toBe(86_789_814);
    expect(rows[0].thang[6]).toBe(40_000_000);
    expect(rows[0].thang[8]).toBe(46_789_814);
    // Doanh số là giá trị đơn hàng — không nhân đôi theo số dòng
    expect(rows[0].doanhSo).toBe(93_733_000);
    expect(tong.doanhSo).toBe(93_733_000);
  });

  it('ghép các sản phẩm khác nhau của cùng đơn hàng, không lặp', () => {
    const { rows } = buildDoanhThuReport([
      entry({ ngay: '2026-02-01', soTien: 1, taiKhoanCo: '511', soHopDong: 'DH01', sanPham: 'NLP Master' }),
      entry({ ngay: '2026-02-02', soTien: 1, taiKhoanCo: '511', soHopDong: 'DH01', sanPham: 'NLP Master' }),
      entry({ ngay: '2026-02-03', soTien: 1, taiKhoanCo: '511', soHopDong: 'DH01', sanPham: 'Train The Trainer' }),
    ]);
    expect(rows[0].sanPham).toBe('NLP Master, Train The Trainer');
  });

  it('dòng 511 không gắn đơn hàng vẫn vào báo cáo, nằm cuối bảng', () => {
    const { rows, tong } = buildDoanhThuReport([
      entry({ ngay: '2026-03-01', soTien: 5_000_000, taiKhoanCo: '511' }),
      entry({ ngay: '2026-03-01', soTien: 10_000_000, taiKhoanCo: '511', soHopDong: 'DH02' }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].tenDonHang).toBe(KHONG_GAN_DON_HANG);
    expect(rows[1].soHopDong).toBe('');
    // Tổng khớp toàn bộ phát sinh Có 511, không nuốt dòng lạc
    expect(tong.doanhThu).toBe(15_000_000);
  });

  it('bỏ qua dòng không phải Có 511', () => {
    const { rows, tong } = buildDoanhThuReport([
      entry({ ngay: '2026-05-01', soTien: 9_000_000, taiKhoanCo: '3387', soHopDong: 'DH02' }),
    ]);
    expect(rows).toHaveLength(0);
    expect(tong.doanhThu).toBe(0);
  });

  it('không có chứng từ nào → bảng rỗng, dòng tổng đủ 12 tháng bằng 0', () => {
    const { rows, tong } = buildDoanhThuReport([]);
    expect(rows).toEqual([]);
    expect(tong.thang).toHaveLength(12);
    expect(tong.thang.every((v) => v === 0)).toBe(true);
  });

  it('sắp xếp đơn hàng theo mã', () => {
    const { rows } = buildDoanhThuReport([
      entry({ ngay: '2026-01-01', soTien: 1, taiKhoanCo: '511', soHopDong: 'DH10' }),
      entry({ ngay: '2026-01-01', soTien: 1, taiKhoanCo: '511', soHopDong: 'DH02' }),
    ]);
    expect(rows.map((r) => r.soHopDong)).toEqual(['DH02', 'DH10']);
  });
});
