import {
  nhanKy,
  khoaKy,
  khoaKyNamTruoc,
  luiMotNam,
  laDoanhThu,
  gomTheoThoiGian,
  ghepCungKy,
  gomTheoChieu,
} from './doanh-so.helper';
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

describe('khoaKy', () => {
  it('khoá sắp xếp được: so sánh chuỗi trùng thứ tự thời gian', () => {
    expect(khoaKy(new Date('2026-03-05T00:00:00Z'), 'ngay')).toBe('2026-03-05');
    expect(khoaKy(new Date('2026-03-05T00:00:00Z'), 'thang')).toBe('2026-03');
    expect(khoaKy(new Date('2026-04-01T00:00:00Z'), 'quy')).toBe('2026-Q2');
    expect(khoaKy(new Date('2026-03-05T00:00:00Z'), 'nam')).toBe('2026');
  });

  it('T3 đứng TRƯỚC T12 theo khoá (nhãn hiển thị thì ngược — lý do phải có khoá riêng)', () => {
    const t3 = new Date('2026-03-01T00:00:00Z');
    const t12 = new Date('2026-12-01T00:00:00Z');
    expect(khoaKy(t3, 'thang').localeCompare(khoaKy(t12, 'thang'))).toBeLessThan(0);
    expect(nhanKy(t3, 'thang').localeCompare(nhanKy(t12, 'thang'))).toBeGreaterThan(0);
  });
});

describe('khoaKyNamTruoc', () => {
  it('lùi đúng một năm, giữ nguyên phần kỳ', () => {
    expect(khoaKyNamTruoc('2026-03')).toBe('2025-03');
    expect(khoaKyNamTruoc('2026-Q2')).toBe('2025-Q2');
    expect(khoaKyNamTruoc('2026-03-05')).toBe('2025-03-05');
    expect(khoaKyNamTruoc('2026')).toBe('2025');
  });
});

describe('luiMotNam', () => {
  it('29/2 năm nhuận kẹp về 28/2 năm trước, không nhảy sang 1/3', () => {
    expect(luiMotNam(new Date('2024-02-29T00:00:00Z')).toISOString()).toBe(
      '2023-02-28T00:00:00.000Z',
    );
  });

  it('giữ nguyên ngày cuối tháng khi năm trước cũng có ngày đó', () => {
    expect(luiMotNam(new Date('2026-01-31T23:59:59.999Z')).toISOString()).toBe(
      '2025-01-31T23:59:59.999Z',
    );
    expect(luiMotNam(new Date('2026-03-31T00:00:00Z')).toISOString()).toBe(
      '2025-03-31T00:00:00.000Z',
    );
    expect(luiMotNam(new Date('2026-04-30T00:00:00Z')).toISOString()).toBe(
      '2025-04-30T00:00:00.000Z',
    );
    expect(luiMotNam(new Date('2026-12-31T23:59:59.999Z')).toISOString()).toBe(
      '2025-12-31T23:59:59.999Z',
    );
  });

  it('28/2 lùi sang năm nhuận vẫn là 28/2', () => {
    expect(luiMotNam(new Date('2025-02-28T00:00:00Z')).toISOString()).toBe(
      '2024-02-28T00:00:00.000Z',
    );
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
    expect(out).toEqual([
      { khoa: '2026-01', nhan: 'T1/2026', soTien: 150 },
      { khoa: '2026-02', nhan: 'T2/2026', soTien: 30 },
    ]);
  });

  it('danh sách rỗng → mảng rỗng', () => {
    expect(gomTheoThoiGian([], 'thang')).toEqual([]);
  });

  it('bút toán đến theo thứ tự GIẢM DẦN (như getNhatKyChung sắp xếp ngay:-1) vẫn ra tăng dần', () => {
    const out = gomTheoThoiGian(
      [
        v('2026-12-01', 12),
        v('2026-11-01', 11),
        v('2026-03-01', 3),
        v('2026-02-01', 2),
        v('2026-01-01', 1),
      ],
      'thang',
    );
    expect(out.map((r) => r.nhan)).toEqual([
      'T1/2026',
      'T2/2026',
      'T3/2026',
      'T11/2026',
      'T12/2026',
    ]);
  });

  it('theo quý và theo ngày cũng tăng dần dù đầu vào đảo ngược', () => {
    expect(
      gomTheoThoiGian([v('2026-10-01', 4), v('2026-04-01', 2), v('2026-01-01', 1)], 'quy').map(
        (r) => r.nhan,
      ),
    ).toEqual(['Q1/2026', 'Q2/2026', 'Q4/2026']);
    expect(
      gomTheoThoiGian([v('2026-01-20', 3), v('2026-01-09', 2), v('2026-01-02', 1)], 'ngay').map(
        (r) => r.nhan,
      ),
    ).toEqual(['02/01/2026', '09/01/2026', '20/01/2026']);
  });
});

describe('ghepCungKy', () => {
  it('ghép theo kỳ tương ứng, không theo vị trí — năm trước thiếu kỳ giữa', () => {
    // 2026 có T1, T2, T3; 2025 chỉ có T1 và T3 (thiếu T2 ở giữa).
    const nay = gomTheoThoiGian(
      [v('2026-01-05', 100), v('2026-02-05', 200), v('2026-03-05', 300)],
      'thang',
    );
    const truoc = gomTheoThoiGian([v('2025-01-05', 10), v('2025-03-05', 30)], 'thang');
    expect(ghepCungKy(nay, truoc)).toEqual([
      { ky: 'T1/2026', kyNay: 100, cungKy: 10 },
      { ky: 'T2/2026', kyNay: 200, cungKy: 0 },
      { ky: 'T3/2026', kyNay: 300, cungKy: 30 },
    ]);
  });

  it('năm trước ít kỳ hơn (chỉ T1, T2) không làm lệch bậc cả chuỗi', () => {
    const nay = gomTheoThoiGian(
      [v('2026-03-05', 300), v('2026-02-05', 200), v('2026-01-05', 100)],
      'thang',
    );
    const truoc = gomTheoThoiGian([v('2025-02-05', 20), v('2025-01-05', 10)], 'thang');
    expect(ghepCungKy(nay, truoc)).toEqual([
      { ky: 'T1/2026', kyNay: 100, cungKy: 10 },
      { ky: 'T2/2026', kyNay: 200, cungKy: 20 },
      { ky: 'T3/2026', kyNay: 300, cungKy: 0 },
    ]);
  });

  it('không có dữ liệu năm trước → cùng kỳ toàn 0', () => {
    const nay = gomTheoThoiGian([v('2026-01-05', 100)], 'thang');
    expect(ghepCungKy(nay, [])).toEqual([{ ky: 'T1/2026', kyNay: 100, cungKy: 0 }]);
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
