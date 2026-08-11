import { describe, it, expect } from 'vitest';
import { tongHopBaoCaoNhanh } from './baoCaoNhanh';

describe('tongHopBaoCaoNhanh', () => {
  it('tập rỗng thì mọi chỉ tiêu bằng 0', () => {
    expect(tongHopBaoCaoNhanh([])).toEqual({
      doanhSo: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      tienThue: 0,
      daThu: 0,
      conPhaiThu: 0,
      daXuatHoaDon: 0,
      chuaXuatHoaDon: 0,
    });
  });

  it('cộng đủ 8 chỉ tiêu của nhiều dòng', () => {
    const r = tongHopBaoCaoNhanh([
      {
        giaTriSauThue: 1_100,
        tienThue: 100,
        daThu: 400,
        dtChuaThucHien: 300,
        dtDaThucHien: 200,
        daTraHoaDon: 550,
      },
      {
        giaTriSauThue: 2_200,
        tienThue: 200,
        daThu: 1_000,
        dtChuaThucHien: 500,
        dtDaThucHien: 700,
        daTraHoaDon: 0,
      },
    ]);
    expect(r.doanhSo).toBe(3_300);
    expect(r.tienThue).toBe(300);
    expect(r.daThu).toBe(1_400);
    expect(r.dtChuaThucHien).toBe(800);
    expect(r.dtDaThucHien).toBe(900);
    expect(r.daXuatHoaDon).toBe(550);
  });

  it('còn phải thu = doanh số trừ đã thu', () => {
    const r = tongHopBaoCaoNhanh([{ giaTriSauThue: 1_000, daThu: 400 }]);
    expect(r.conPhaiThu).toBe(600);
  });

  it('chưa xuất hóa đơn = doanh số trừ đã xuất, âm khi xuất vượt', () => {
    const r = tongHopBaoCaoNhanh([{ giaTriSauThue: 1_000, daTraHoaDon: 1_200 }]);
    expect(r.chuaXuatHoaDon).toBe(-200);
  });

  it('trường thiếu coi như 0, không ra NaN', () => {
    const r = tongHopBaoCaoNhanh([{}, { giaTriSauThue: 500 }]);
    expect(r.doanhSo).toBe(500);
    expect(r.daThu).toBe(0);
    expect(Number.isNaN(r.conPhaiThu)).toBe(false);
  });

  it('chuỗi số từ backend decimal vẫn cộng đúng', () => {
    const r = tongHopBaoCaoNhanh([
      { giaTriSauThue: '1000' as unknown as number, daThu: '250' as unknown as number },
    ]);
    expect(r.doanhSo).toBe(1_000);
    expect(r.conPhaiThu).toBe(750);
  });
});
