import {
  chiTieuGocRong,
  congButToan,
  tinhChiTieuDanXuat,
  tinhChiTieuGoc,
} from './kqkd-chi-tieu';

describe('tinhChiTieuGoc', () => {
  it('cộng doanh thu theo phát sinh CÓ của 511', () => {
    const g = tinhChiTieuGoc([
      { soTien: 100, maTaiKhoanNo: '131', maTaiKhoanCo: '511' },
    ]);
    expect(g['01']).toBe(100);
  });

  it('không tính 511 khi nó nằm bên NỢ', () => {
    const g = tinhChiTieuGoc([
      { soTien: 100, maTaiKhoanNo: '511', maTaiKhoanCo: '911' },
    ]);
    expect(g['01']).toBe(0);
  });

  it('tài khoản con tính vào tài khoản cha', () => {
    const g = tinhChiTieuGoc([
      { soTien: 300, maTaiKhoanNo: '131', maTaiKhoanCo: '5111' },
      { soTien: 200, maTaiKhoanNo: '6321', maTaiKhoanCo: '156' },
    ]);
    expect(g['01']).toBe(300);
    expect(g['11']).toBe(200);
  });

  it('cộng giảm trừ doanh thu theo phát sinh NỢ của 521', () => {
    const g = tinhChiTieuGoc([
      { soTien: 50, maTaiKhoanNo: '5211', maTaiKhoanCo: '131' },
    ]);
    expect(g['02']).toBe(50);
  });

  it('8211 và 8212 không lẫn vào nhau', () => {
    const g = tinhChiTieuGoc([
      { soTien: 10, maTaiKhoanNo: '8211', maTaiKhoanCo: '3334' },
      { soTien: 7, maTaiKhoanNo: '8212', maTaiKhoanCo: '347' },
    ]);
    expect(g['51']).toBe(10);
    expect(g['52']).toBe(7);
  });

  it('một bút toán khớp cả hai bên rơi vào cả hai chỉ tiêu', () => {
    const g = tinhChiTieuGoc([
      { soTien: 80, maTaiKhoanNo: '641', maTaiKhoanCo: '511' },
    ]);
    expect(g['25']).toBe(80);
    expect(g['01']).toBe(80);
  });

  it('thiếu mã tài khoản thì bỏ qua, không văng lỗi', () => {
    expect(() => tinhChiTieuGoc([{ soTien: 5 }])).not.toThrow();
    expect(tinhChiTieuGoc([{ soTien: 5 }])['01']).toBe(0);
  });

  it('phủ đủ các chỉ tiêu gốc còn lại', () => {
    const g = tinhChiTieuGoc([
      { soTien: 1, maTaiKhoanNo: '112', maTaiKhoanCo: '515' },
      { soTien: 2, maTaiKhoanNo: '635', maTaiKhoanCo: '112' },
      { soTien: 3, maTaiKhoanNo: '642', maTaiKhoanCo: '331' },
      { soTien: 4, maTaiKhoanNo: '112', maTaiKhoanCo: '711' },
      { soTien: 5, maTaiKhoanNo: '811', maTaiKhoanCo: '112' },
    ]);
    expect(g).toMatchObject({ '21': 1, '22': 2, '26': 3, '31': 4, '32': 5 });
  });
});

describe('congButToan', () => {
  it('cộng dồn tại chỗ vào rổ có sẵn', () => {
    const rong = chiTieuGocRong();
    congButToan(rong, { soTien: 10, maTaiKhoanCo: '511' });
    congButToan(rong, { soTien: 15, maTaiKhoanCo: '511' });
    expect(rong['01']).toBe(25);
  });

  it('chiTieuGocRong trả rổ mới, không dùng chung tham chiếu', () => {
    const a = chiTieuGocRong();
    congButToan(a, { soTien: 10, maTaiKhoanCo: '511' });
    expect(chiTieuGocRong()['01']).toBe(0);
  });
});

describe('tinhChiTieuDanXuat', () => {
  it('tính đúng bảy chỉ tiêu suy ra', () => {
    const g = chiTieuGocRong();
    Object.assign(g, {
      '01': 1000, '02': 100, '11': 400, '21': 30, '22': 20,
      '25': 50, '26': 60, '31': 15, '32': 5, '51': 12, '52': 3,
    });
    expect(tinhChiTieuDanXuat(g)).toEqual({
      m10: 900,          // 1000 − 100
      m20: 500,          // 900 − 400
      m30: 400,          // 500 + (30 − 20) − (50 + 60)
      m40: 10,           // 15 − 5
      m50: 410,          // 400 + 10
      m60: 395,          // 410 − 12 − 3
      tongChiPhi: 130,   // 20 + 50 + 60
    });
  });

  it('rổ rỗng cho ra toàn số 0', () => {
    expect(tinhChiTieuDanXuat(chiTieuGocRong())).toEqual({
      m10: 0, m20: 0, m30: 0, m40: 0, m50: 0, m60: 0, tongChiPhi: 0,
    });
  });
});
