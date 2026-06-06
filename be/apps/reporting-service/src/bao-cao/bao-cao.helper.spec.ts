import { openingNetForSide, buildDoiTuongSoTien } from './bao-cao.service';

describe('openingNetForSide', () => {
  it('undefined opening → 0', () => {
    expect(openingNetForSide(undefined, 'NO')).toBe(0);
    expect(openingNetForSide(undefined, 'CO')).toBe(0);
  });

  it('phía NO (tài sản): net = duNo - duCo', () => {
    expect(openingNetForSide({ duNo: 1000000, duCo: 0 }, 'NO')).toBe(1000000);
    expect(openingNetForSide({ duNo: 1000000, duCo: 200000 }, 'NO')).toBe(800000);
  });

  it('phía CO (nguồn vốn): net = duCo - duNo', () => {
    expect(openingNetForSide({ duNo: 0, duCo: 500000 }, 'CO')).toBe(500000);
    expect(openingNetForSide({ duNo: 100000, duCo: 500000 }, 'CO')).toBe(400000);
  });
});

describe('buildDoiTuongSoTien', () => {
  const v = (maNo: string, maCo: string, dtMa: string | undefined, soTien: number) => ({
    soPhieu: 'x', loai: 'PHIEU_THU' as const, ngay: new Date(), noiDung: '', soTien,
    danhMuc: {
      taiKhoanNo: { ma: maNo, ten: '', loai: '', nhom: '' },
      taiKhoanCo: { ma: maCo, ten: '', loai: '', nhom: '' },
      ...(dtMa ? { doiTuong: { ma: dtMa, ten: `Tên ${dtMa}`, loai: '' } } : {}),
    },
  });

  it('phân rã số dư TK 131 (phía NO) theo đối tượng, Σ = số dư TK', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', 'KH02', 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', []);
    const tong = rows.reduce((s, r) => s + r.soTien, 0);
    expect(tong).toBe(500);
    expect(rows.map((r) => r.ma).sort()).toEqual(['KH01', 'KH02']);
  });

  it('chứng từ thiếu đối tượng → dòng "Chưa xác định đối tượng" (ma rỗng)', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', undefined, 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', []);
    const orphan = rows.find((r) => r.ma === '');
    expect(orphan?.ten).toBe('Chưa xác định đối tượng');
    expect(orphan?.soTien).toBe(200);
  });

  it('cộng opening theo đối tượng và bỏ dòng 0', () => {
    const rows = buildDoiTuongSoTien([], '131', 'NO', [
      { chiTietMa: 'KH01', chiTietTen: 'A', net: 1000 },
      { chiTietMa: 'KH02', chiTietTen: 'B', net: 0 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('KH01');
    expect(rows[0].soTien).toBe(1000);
  });
});
