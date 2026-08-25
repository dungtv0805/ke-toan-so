import { describe, expect, it } from 'vitest';
import {
  dienGiaiMacDinh,
  moTaCanhBao,
  tongSoTien,
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
