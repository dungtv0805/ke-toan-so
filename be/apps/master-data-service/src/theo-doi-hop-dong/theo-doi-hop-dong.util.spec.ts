import { tienHoaDon } from './theo-doi-hop-dong.util';

describe('tienHoaDon', () => {
  it('cộng tiền hàng và tiền thuế', () => {
    expect(tienHoaDon({ tienHang: 100, tienThue: 10, tong: 999 })).toBe(110);
  });

  it('chỉ có tiền hàng thì lấy tiền hàng', () => {
    expect(tienHoaDon({ tienHang: 100, tong: 999 })).toBe(100);
  });

  it('thiếu cả tiền hàng lẫn tiền thuế thì rơi về tổng (dữ liệu nhập cũ)', () => {
    expect(tienHoaDon({ tong: 250 })).toBe(250);
  });

  it('không có số nào thì trả 0', () => {
    expect(tienHoaDon({})).toBe(0);
  });

  it('chuỗi số từ MongoDB decimal vẫn cộng đúng', () => {
    expect(
      tienHoaDon({
        tienHang: '100' as unknown as number,
        tienThue: '10' as unknown as number,
      }),
    ).toBe(110);
  });
});
