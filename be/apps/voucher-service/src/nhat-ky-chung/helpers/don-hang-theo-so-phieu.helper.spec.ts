import { donHangTheoSoPhieu, tachDanhSachSoPhieu } from './don-hang-theo-so-phieu.helper';

describe('tachDanhSachSoPhieu', () => {
  it('tách theo dấu phẩy, bỏ trống, bỏ trùng, giữ nguyên "/" trong số phiếu', () => {
    expect(tachDanhSachSoPhieu('PT01/26, PC02,,PT01/26 ')).toEqual(['PT01/26', 'PC02']);
  });

  it('rỗng / thiếu thì ra mảng rỗng', () => {
    expect(tachDanhSachSoPhieu(undefined)).toEqual([]);
    expect(tachDanhSachSoPhieu('  ')).toEqual([]);
  });

  it('chặn quá 200 số phiếu một lần gọi', () => {
    const nhieu = Array.from({ length: 250 }, (_, i) => `P${i}`).join(',');
    expect(tachDanhSachSoPhieu(nhieu)).toHaveLength(200);
  });
});

describe('donHangTheoSoPhieu', () => {
  it('mỗi số phiếu lấy đơn hàng của bút toán đầu tiên CÓ đơn hàng', () => {
    const kq = donHangTheoSoPhieu([
      { soPhieu: 'PT01', soHopDong: '' },
      { soPhieu: 'PT01', soHopDong: 'DH128', tenCongTrinh: 'Nhà A' },
      { soPhieu: 'PT01', soHopDong: 'DH999' },
      { soPhieu: 'PC02', soHopDong: null },
    ]);
    expect(kq).toEqual({ PT01: { soHopDong: 'DH128', tenCongTrinh: 'Nhà A' } });
  });

  it('không có bút toán nào thì ra đối tượng rỗng', () => {
    expect(donHangTheoSoPhieu([])).toEqual({});
  });
});
