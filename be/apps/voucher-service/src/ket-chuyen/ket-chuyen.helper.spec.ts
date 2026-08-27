import {
  chonNghiepVu,
  dungCuaSoKetChuyen,
  gomLoKetChuyen,
  khoaCapTaiKhoan,
  tinhLaiLoTuDong,
} from './ket-chuyen.helper';

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

  // Danh mục có thể thiếu dòng `911 → 421x` (danh mục bắt đầu trống, banner cảnh báo
  // KHÔNG chặn Lưu). Khi đó lô đã ghi không có bút toán chốt, nhưng lãi/lỗ vẫn đo được
  // từ net của 911 trong lô — nếu trả 0 thì form hiện "Lãi 70" còn danh sách hiện
  // "Lãi 0" cho cùng một lô.
  it('rơi về net của 911 khi lô không có bút toán chốt — lãi', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
    ]);

    expect(laiLo).toBe(70);
  });

  it('rơi về net của 911 khi lô không có bút toán chốt — lỗ', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '511', taiKhoanCo: '911', soTien: 30 },
      { taiKhoanNo: '911', taiKhoanCo: '642', soTien: 100 },
    ]);

    expect(laiLo).toBe(-70);
  });

  it('trả 0 (không phải -0) khi lô không dính tài khoản 911 nào', () => {
    const laiLo = tinhLaiLoTuDong([{ taiKhoanNo: '641', taiKhoanCo: '642', soTien: 10 }]);

    expect(laiLo).toBe(0);
    expect(Object.is(laiLo, -0)).toBe(false);
  });

  it('vẫn ưu tiên bút toán chốt khi lô có đủ dòng 911 → 421x', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
      { taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
    ]);

    expect(laiLo).toBe(70);
  });
});

describe('dungCuaSoKetChuyen', () => {
  it('dựng cửa sổ từ đầu năm đến cuối ngày chốt', () => {
    const { dauNam, ngayKetThuc } = dungCuaSoKetChuyen('2026-08-31');

    expect(dauNam.getFullYear()).toBe(2026);
    expect(dauNam.getMonth()).toBe(0);
    expect(dauNam.getDate()).toBe(1);
    expect(ngayKetThuc.getFullYear()).toBe(2026);
    expect(ngayKetThuc.getHours()).toBe(23);
    expect(ngayKetThuc.getMinutes()).toBe(59);
    expect(ngayKetThuc.getSeconds()).toBe(59);
    expect(ngayKetThuc.getMilliseconds()).toBe(999);
  });

  it('dựng đầu năm cùng cơ sở múi giờ với ngày kết thúc (không lệch năm ở biên 31/12)', () => {
    const { dauNam, ngayKetThuc } = dungCuaSoKetChuyen('2025-12-31');

    expect(ngayKetThuc.getFullYear()).toBe(2025);
    expect(dauNam.getTime()).toBe(new Date(ngayKetThuc.getFullYear(), 0, 1).getTime());
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

describe('chonNghiepVu', () => {
  const QUY_CHUAN = new Map([
    [khoaCapTaiKhoan('511', '911'), 'Kết chuyển doanh thu thuần'],
    [khoaCapTaiKhoan('911', '4212'), '  Kết chuyển lãi  '],
  ]);

  it('ưu tiên nghiệp vụ khai trong quy chuẩn', () => {
    expect(chonNghiepVu(QUY_CHUAN, '511', '911', 'Kết chuyển doanh thu bán hàng')).toBe(
      'Kết chuyển doanh thu thuần',
    );
  });

  it('cắt khoảng trắng thừa của quy chuẩn', () => {
    expect(chonNghiepVu(QUY_CHUAN, '911', '4212', 'x')).toBe('Kết chuyển lãi');
  });

  it('rơi về diễn giải danh mục khi cặp TK chưa khai quy chuẩn', () => {
    expect(chonNghiepVu(QUY_CHUAN, '632', '911', 'Kết chuyển giá vốn hàng bán')).toBe(
      'Kết chuyển giá vốn hàng bán',
    );
  });

  it('không gắn chuỗi rỗng khi cả hai nguồn đều trống', () => {
    expect(chonNghiepVu(QUY_CHUAN, '632', '911', '   ')).toBeUndefined();
    expect(chonNghiepVu(new Map(), '632', '911', undefined)).toBeUndefined();
  });

  it('phân biệt chiều Nợ/Có — 511/911 khác 911/511', () => {
    expect(chonNghiepVu(QUY_CHUAN, '911', '511', undefined)).toBeUndefined();
  });
});
