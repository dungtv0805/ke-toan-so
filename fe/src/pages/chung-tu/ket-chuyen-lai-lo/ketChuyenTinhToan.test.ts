import { describe, expect, it } from 'vitest';
import {
  boKhoaDong,
  dienGiaiMacDinh,
  ganKhoaDong,
  moTaCanhBao,
  suaDong,
  tongSoTien,
  xoaDong,
  type DongHachToan,
} from './ketChuyenTinhToan';

describe('tongSoTien', () => {
  it('cộng dồn số tiền các dòng hạch toán', () => {
    expect(
      tongSoTien([
        { maKetChuyen: '511-911', dienGiai: '', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
        { maKetChuyen: '911-4212', dienGiai: '', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
      ]),
    ).toBe(170);
  });

  it('trả 0 khi không có dòng nào', () => {
    expect(tongSoTien([])).toBe(0);
  });
});

describe('dienGiaiMacDinh', () => {
  it('sinh diễn giải theo ngày kết chuyển dạng dd/mm/yyyy', () => {
    expect(dienGiaiMacDinh('2026-08-31')).toBe('Kết chuyển lãi lỗ đến ngày 31/08/2026');
  });
});

describe('moTaCanhBao', () => {
  it('nêu rõ tài khoản, số tiền và lý do', () => {
    expect(
      moTaCanhBao({ ma: '642', ten: 'Chi phí quản lý doanh nghiệp', soTien: 12000000, ben: 'NO' }),
    ).toBe(
      'TK 642 — Chi phí quản lý doanh nghiệp còn dư Nợ 12.000.000 chưa được kết chuyển (chưa khai trong danh mục)',
    );
  });

  it('hiển thị đúng bên Có', () => {
    expect(moTaCanhBao({ ma: '511', ten: 'Doanh thu', soTien: 500, ben: 'CO' })).toContain('dư Có 500');
  });
});

describe('khoá dòng hạch toán', () => {
  // Engine sinh MỘT dòng cho MỖI tài khoản chi tiết khớp tiền tố: khai `642 → 911`
  // mà công ty hạch toán vào 6421 và 6422 thì ra hai dòng cùng mang mã '642-911'.
  const HAI_DONG_CUNG_MA: DongHachToan[] = [
    { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí', taiKhoanNo: '911', taiKhoanCo: '6421', soTien: 30 },
    { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí', taiKhoanNo: '911', taiKhoanCo: '6422', soTien: 20 },
  ];

  it('cấp khoá duy nhất cho từng dòng dù trùng maKetChuyen', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    expect(ds).toHaveLength(2);
    expect(ds[0].khoa).not.toBe(ds[1].khoa);
    expect(new Set(ds.map((d) => d.khoa)).size).toBe(2);
  });

  it('giữ nguyên maKetChuyen để payload gửi BE không đổi', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    expect(ds.every((d) => d.maKetChuyen === '642-911')).toBe(true);
  });

  it('sửa một dòng KHÔNG đụng dòng kia dù cùng maKetChuyen', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    const sau = suaDong(ds, ds[0].khoa, { soTien: 999 });

    expect(sau[0].soTien).toBe(999);
    expect(sau[1].soTien).toBe(20);
  });

  it('sửa diễn giải một dòng KHÔNG đụng diễn giải dòng kia', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    const sau = suaDong(ds, ds[1].khoa, { dienGiai: 'Chi phí bán hàng' });

    expect(sau[1].dienGiai).toBe('Chi phí bán hàng');
    expect(sau[0].dienGiai).toBe('Kết chuyển chi phí');
  });

  it('xóa một dòng KHÔNG xóa dòng kia dù cùng maKetChuyen', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    const sau = xoaDong(ds, ds[0].khoa);

    expect(sau).toHaveLength(1);
    expect(sau[0].taiKhoanCo).toBe('6422');
  });

  it('sửa dòng giữ nguyên khoá để React không mất focus ô đang gõ', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    const sau = suaDong(ds, ds[0].khoa, { soTien: 1 });

    expect(sau.map((d) => d.khoa)).toEqual(ds.map((d) => d.khoa));
  });

  it('boKhoaDong trả đúng các field DTO của BE, không kèm khoá', () => {
    const ds = ganKhoaDong(HAI_DONG_CUNG_MA);

    const payload = boKhoaDong(ds);

    expect(payload[0]).toEqual({
      maKetChuyen: '642-911',
      dienGiai: 'Kết chuyển chi phí',
      taiKhoanNo: '911',
      taiKhoanCo: '6421',
      soTien: 30,
    });
    expect(payload.every((d) => !('khoa' in d))).toBe(true);
  });
});
