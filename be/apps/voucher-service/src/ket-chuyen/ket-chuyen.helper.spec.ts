import { gomLoKetChuyen, tinhLaiLoTuDong } from './ket-chuyen.helper';

describe('tinhLaiLoTuDong', () => {
  it('lãi khi 911 nằm bên Nợ và bên kia không phải tài khoản KQKD', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
      { taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
    ]);

    expect(laiLo).toBe(70);
  });

  it('lỗ khi 911 nằm bên Có của bút toán chốt', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '4212', taiKhoanCo: '911', soTien: 70 },
    ]);

    expect(laiLo).toBe(-70);
  });

  it('trả 0 khi lô không có bút toán chốt', () => {
    expect(tinhLaiLoTuDong([{ taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }])).toBe(0);
  });
});

describe('gomLoKetChuyen', () => {
  it('gom các dòng cùng số phiếu thành một lô và cộng tổng tiền', () => {
    const lo = gomLoKetChuyen([
      {
        soPhieu: 'NVK202608/001',
        ngay: new Date('2026-08-31'),
        noiDung: 'Kết chuyển doanh thu',
        soTien: 100,
        nguoiTaoId: 'u1',
        danhMuc: { taiKhoanNo: { ma: '511' }, taiKhoanCo: { ma: '911' } },
      },
      {
        soPhieu: 'NVK202608/001',
        ngay: new Date('2026-08-31'),
        noiDung: 'Kết chuyển lãi lỗ',
        soTien: 100,
        nguoiTaoId: 'u1',
        danhMuc: { taiKhoanNo: { ma: '911' }, taiKhoanCo: { ma: '4212' } },
      },
    ] as any);

    expect(lo).toHaveLength(1);
    expect(lo[0].soPhieu).toBe('NVK202608/001');
    expect(lo[0].soDong).toBe(2);
    expect(lo[0].tongTien).toBe(200);
    expect(lo[0].laiLo).toBe(100);
  });

  it('sắp xếp lô mới nhất lên đầu', () => {
    const lo = gomLoKetChuyen([
      { soPhieu: 'A', ngay: new Date('2026-06-30'), noiDung: 'x', soTien: 1, danhMuc: {} },
      { soPhieu: 'B', ngay: new Date('2026-08-31'), noiDung: 'y', soTien: 1, danhMuc: {} },
    ] as any);

    expect(lo.map((l) => l.soPhieu)).toEqual(['B', 'A']);
  });
});
