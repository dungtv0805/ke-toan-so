import { gomTongHopDonHang, DongHachToan } from './tong-hop-don-hang.helper';

const dong = (d: Partial<DongHachToan>): DongHachToan => ({
  ngay: '2026-03-10',
  soTien: 0,
  ...d,
});

describe('gomTongHopDonHang', () => {
  it('không có dòng nào thì trả 2 mảng rỗng', () => {
    expect(gomTongHopDonHang([], 2026)).toEqual({
      theoDonHang: [],
      khongCoDonHang: [],
    });
  });

  it('cộng đã thu từ Nợ 111 và Nợ 112', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanNo: '1111', taiKhoanCo: '3387', soTien: 100 }),
        dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '3387', soTien: 200 }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].daThu).toBe(300);
  });

  it('doanh thu chưa thực hiện = Có 3387 trừ Nợ 3387', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '33871', soTien: 500 }),
        dong({ soHopDong: 'HD01', taiKhoanNo: '33871', taiKhoanCo: '5113', soTien: 200 }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(300);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(200);
  });

  it('3387 bị ghi âm thì chặn về 0, không trả số âm', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '3387', taiKhoanCo: '511', soTien: 900 })],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(0);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(900);
  });

  it('TK con dài hơn vẫn khớp prefix', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '11211', taiKhoanCo: '51131', soTien: 50 })],
      2026,
    );
    expect(r.theoDonHang[0].daThu).toBe(50);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(50);
  });

  it('TK 3388 không nhầm với 3387', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '3388', soTien: 700 })],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(0);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(0);
    expect(r.theoDonHang[0].daThu).toBe(700);
  });

  it('tách theo từng đơn hàng', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 100 }),
        dong({ soHopDong: 'HD02', taiKhoanCo: '511', soTien: 250 }),
      ],
      2026,
    );
    const byId = Object.fromEntries(r.theoDonHang.map((x) => [x.soHopDong, x]));
    expect(byId['HD01'].dtDaThucHien).toBe(100);
    expect(byId['HD02'].dtDaThucHien).toBe(250);
  });

  it('dtTheoThang có 12 phần tử, đặt đúng tháng của ngày chứng từ', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 10, ngay: '2026-01-05' }),
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 20, ngay: '2026-12-31' }),
      ],
      2026,
    );
    const t = r.theoDonHang[0].dtTheoThang;
    expect(t).toHaveLength(12);
    expect(t[0]).toBe(10);
    expect(t[11]).toBe(20);
    expect(t.reduce((s, x) => s + x, 0)).toBe(30);
  });

  it('doanh thu năm khác không vào dtTheoThang nhưng vẫn vào luỹ kế', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 80, ngay: '2025-06-01' })],
      2026,
    );
    expect(r.theoDonHang[0].dtDaThucHien).toBe(80);
    expect(r.theoDonHang[0].dtTheoThang.reduce((s, x) => s + x, 0)).toBe(0);
  });

  it('511 không gắn đơn hàng gom theo mã sản phẩm', () => {
    const r = gomTongHopDonHang(
      [
        dong({ taiKhoanCo: '511', soTien: 30, sanPhamMa: 'SP1', sanPhamTen: 'Sản phẩm 1' }),
        dong({ taiKhoanCo: '511', soTien: 40, sanPhamMa: 'SP1', sanPhamTen: 'Sản phẩm 1' }),
      ],
      2026,
    );
    expect(r.theoDonHang).toHaveLength(0);
    expect(r.khongCoDonHang).toHaveLength(1);
    expect(r.khongCoDonHang[0].sanPhamMa).toBe('SP1');
    expect(r.khongCoDonHang[0].dtTheoThang[2]).toBe(70);
  });

  it('hai sản phẩm trùng tên khác mã không bị gộp', () => {
    const r = gomTongHopDonHang(
      [
        dong({ taiKhoanCo: '511', soTien: 30, sanPhamMa: 'SP1', sanPhamTen: 'Trùng tên' }),
        dong({ taiKhoanCo: '511', soTien: 40, sanPhamMa: 'SP2', sanPhamTen: 'Trùng tên' }),
      ],
      2026,
    );
    expect(r.khongCoDonHang).toHaveLength(2);
  });

  it('511 không đơn hàng và không sản phẩm gom vào mã rỗng', () => {
    const r = gomTongHopDonHang([dong({ taiKhoanCo: '511', soTien: 15 })], 2026);
    expect(r.khongCoDonHang[0].sanPhamMa).toBe('');
  });

  it('dòng không đơn hàng và không phải 511 thì bỏ qua', () => {
    const r = gomTongHopDonHang(
      [dong({ taiKhoanNo: '1121', taiKhoanCo: '131', soTien: 999 })],
      2026,
    );
    expect(r.theoDonHang).toHaveLength(0);
    expect(r.khongCoDonHang).toHaveLength(0);
  });

  it('soTien dạng chuỗi vẫn cộng đúng', () => {
    const r = gomTongHopDonHang(
      [
        dong({
          soHopDong: 'HD01',
          taiKhoanCo: '511',
          soTien: '250' as unknown as number,
        }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtDaThucHien).toBe(250);
  });

  it('ngay dạng Date vẫn đọc đúng tháng', () => {
    const r = gomTongHopDonHang(
      [
        dong({
          soHopDong: 'HD01',
          taiKhoanCo: '511',
          soTien: 60,
          ngay: new Date(Date.UTC(2026, 6, 15)),
        }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtTheoThang[6]).toBe(60);
  });
});
