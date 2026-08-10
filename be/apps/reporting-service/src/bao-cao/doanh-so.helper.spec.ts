import { nhanKy, laDoanhThu, gomTheoThoiGian, gomTheoChieu } from './doanh-so.helper';
import type { NhatKyChungEntry } from '@app/dto';

const v = (
  ngay: string,
  soTien: number,
  maCo = '5111',
  danhMucThem: Record<string, unknown> = {},
): NhatKyChungEntry =>
  ({
    soPhieu: 'PT01',
    ngay: new Date(ngay),
    soTien,
    noiDung: '',
    danhMuc: { taiKhoanCo: { ma: maCo }, ...danhMucThem },
  }) as unknown as NhatKyChungEntry;

describe('nhanKy', () => {
  it('theo ngày: dd/MM/yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'ngay')).toBe('05/03/2026');
  });
  it('theo tháng: T<m>/yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'thang')).toBe('T3/2026');
  });
  it('theo quý: Q<q>/yyyy — tháng 3 thuộc Q1, tháng 4 thuộc Q2', () => {
    expect(nhanKy(new Date('2026-03-31T00:00:00Z'), 'quy')).toBe('Q1/2026');
    expect(nhanKy(new Date('2026-04-01T00:00:00Z'), 'quy')).toBe('Q2/2026');
  });
  it('theo năm: yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'nam')).toBe('2026');
  });
});

describe('laDoanhThu', () => {
  it('bút toán có TK Có bắt đầu 511 là doanh thu', () => {
    expect(laDoanhThu(v('2026-01-01', 100, '5111'))).toBe(true);
  });
  it('TK Có khác 511 thì không', () => {
    expect(laDoanhThu(v('2026-01-01', 100, '515'))).toBe(false);
  });
  it('đọc được cả trường legacy taiKhoanCo ở cấp gốc', () => {
    const legacy = { soPhieu: 'X', ngay: new Date(), soTien: 1, noiDung: '', taiKhoanCo: '5112' };
    expect(laDoanhThu(legacy as unknown as NhatKyChungEntry)).toBe(true);
  });
});

describe('gomTheoThoiGian', () => {
  it('cộng dồn doanh thu cùng kỳ, bỏ bút toán không phải 511', () => {
    const out = gomTheoThoiGian(
      [v('2026-01-10', 100), v('2026-01-20', 50), v('2026-02-01', 30), v('2026-01-25', 999, '331')],
      'thang',
    );
    expect(out.get('T1/2026')).toBe(150);
    expect(out.get('T2/2026')).toBe(30);
    expect(out.size).toBe(2);
  });

  it('danh sách rỗng → map rỗng', () => {
    expect(gomTheoThoiGian([], 'thang').size).toBe(0);
  });
});

describe('gomTheoChieu', () => {
  it('gom theo tên chiều, sắp xếp giảm dần', () => {
    const rows = gomTheoChieu(
      [
        v('2026-01-01', 100, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
        v('2026-01-02', 300, '5111', { nhanVien: { ma: 'NV2', ten: 'Bình' } }),
        v('2026-01-03', 50, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
      ],
      'nhanVien',
    );
    expect(rows).toEqual([
      { ten: 'Bình', soTien: 300 },
      { ten: 'An', soTien: 150 },
    ]);
  });

  it('hợp đồng dùng soHopDong vì snapshot không có ma', () => {
    const rows = gomTheoChieu([v('2026-01-01', 700, '5111', { hopDong: { soHopDong: 'HD-9' } })], 'hopDong');
    expect(rows).toEqual([{ ten: 'HD-9', soTien: 700 }]);
  });

  it('bút toán thiếu chiều gom vào "Không xác định", không bị loại bỏ', () => {
    const rows = gomTheoChieu(
      [v('2026-01-01', 400), v('2026-01-02', 100)],
      'nhanVien',
    );
    expect(rows).toEqual([{ ten: 'Không xác định', soTien: 500 }]);
  });

  it('tổng các nhóm bằng tổng doanh số — trộn bút toán có chiều và không chiều', () => {
    const vouchers = [
      v('2026-01-01', 100, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
      v('2026-01-02', 300, '5111', { nhanVien: { ma: 'NV2', ten: 'Bình' } }),
      v('2026-01-03', 50), // thiếu chiều
      v('2026-01-04', 999, '331'), // không phải doanh thu, không tính
    ];
    const rows = gomTheoChieu(vouchers, 'nhanVien');
    const tongNhom = rows.reduce((s, r) => s + r.soTien, 0);
    const tongDoanhThu = vouchers.filter((x) => laDoanhThu(x)).reduce((s, x) => s + x.soTien, 0);
    expect(tongNhom).toBe(tongDoanhThu);
    expect(tongNhom).toBe(450);
  });

  it('hai đối tượng khác mã nhưng trùng tên ra hai dòng riêng', () => {
    const rows = gomTheoChieu(
      [
        v('2026-01-01', 100, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
        v('2026-01-02', 200, '5111', { nhanVien: { ma: 'NV2', ten: 'An' } }),
      ],
      'nhanVien',
    );
    expect(rows).toHaveLength(2);
    expect(rows.reduce((s, r) => s + r.soTien, 0)).toBe(300);
  });

  it('cùng một mã nhưng tên ghi lệch giữa các kỳ vẫn gộp một dòng', () => {
    const rows = gomTheoChieu(
      [
        v('2026-01-01', 100, '5111', { nhanVien: { ma: 'NV1', ten: 'Nguyễn Văn An' } }),
        v('2026-02-01', 200, '5111', { nhanVien: { ma: 'NV1', ten: 'An (đã đổi tên)' } }),
      ],
      'nhanVien',
    );
    expect(rows).toEqual([{ ten: 'Nguyễn Văn An', soTien: 300 }]);
  });
});
