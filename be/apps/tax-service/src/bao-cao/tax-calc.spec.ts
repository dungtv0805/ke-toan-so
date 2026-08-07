import {
  tinhThueSuatTNDN,
  tongVatTheoKy,
  tinhTNDNQuy,
  tinhTNDNLuyKe,
} from './tax-calc';

describe('tinhThueSuatTNDN — bậc thang theo doanh thu lũy kế', () => {
  it('doanh thu < 1 tỷ → vẫn 15% (không có bậc 0%)', () =>
    expect(tinhThueSuatTNDN(900_000_000)).toBe(0.15));
  it('DT < 3 tỷ → 15%', () =>
    expect(tinhThueSuatTNDN(2_000_000_000)).toBe(0.15));
  it('3 tỷ ≤ DT < 50 tỷ → 17%', () =>
    expect(tinhThueSuatTNDN(10_000_000_000)).toBe(0.17));
  it('DT ≥ 50 tỷ → 20%', () =>
    expect(tinhThueSuatTNDN(60_000_000_000)).toBe(0.2));
  it('biên 1 tỷ → 15%', () => expect(tinhThueSuatTNDN(1_000_000_000)).toBe(0.15));
});

describe('tongVatTheoKy', () => {
  it('cộng tiền thuế', () =>
    expect(tongVatTheoKy([{ tienThue: 100 }, { tienThue: 50 }])).toBe(150));
  it('mảng rỗng → 0', () => expect(tongVatTheoKy([])).toBe(0));
});

describe('tinhTNDNQuy', () => {
  it('LN trước thuế = (511+515+711) − (632+641+642+811)', () => {
    const r = tinhTNDNQuy({
      dt511: 1000,
      dt515: 0,
      dt711: 0,
      cp632: 400,
      cp641: 100,
      cp642: 100,
      cp811: 0,
      chiPhiKhongTru: 0,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.lnTruocThue).toBe(400);
    expect(r.thuNhapTinhThue).toBe(400);
    expect(r.thueTNDN).toBe(80);
    expect(r.lnSauThue).toBe(320);
  });

  it('chi phí không được trừ làm tăng thu nhập tính thuế', () => {
    const r = tinhTNDNQuy({
      dt511: 1000,
      dt515: 0,
      dt711: 0,
      cp632: 400,
      cp641: 0,
      cp642: 0,
      cp811: 0,
      chiPhiKhongTru: 200,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.thuNhapTinhThue).toBe(800); // 600 + 200
    expect(r.thueTNDN).toBe(160);
  });

  it('thu nhập tính thuế âm → thuế TNDN = 0 (không âm)', () => {
    const r = tinhTNDNQuy({
      dt511: 100,
      dt515: 0,
      dt711: 0,
      cp632: 500,
      cp641: 0,
      cp642: 0,
      cp811: 0,
      chiPhiKhongTru: 0,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.lnTruocThue).toBe(-400);
    expect(r.thueTNDN).toBe(0);
    expect(r.lnSauThue).toBe(-400);
  });

  // Regression: quý lãi nhưng doanh thu lũy kế < 1 tỷ trước đây ra thuế = 0.
  it('quý có lãi, doanh thu lũy kế < 1 tỷ → vẫn tính thuế 15%', () => {
    const thueSuat = tinhThueSuatTNDN(883_612_905);
    const r = tinhTNDNQuy({
      dt511: 883_612_905,
      dt515: 0,
      dt711: 0,
      cp632: 91_080_933.07,
      cp641: 0,
      cp642: 474_415_053.96,
      cp811: 0,
      chiPhiKhongTru: 86_287_000,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat,
    });
    expect(thueSuat).toBe(0.15);
    expect(r.thueTNDN).toBeGreaterThan(0);
    expect(r.thueTNDN).toBeCloseTo(r.thuNhapTinhThue * 0.15, 2);
    expect(r.lnSauThue).toBeCloseTo(r.lnTruocThue - r.thueTNDN, 2);
  });
});

describe('tinhTNDNLuyKe — quyết toán năm', () => {
  it('lỗ quý này bù trừ lãi quý khác (khác tổng thuế tạm tính 4 quý)', () => {
    // Q1 TNTT +404.403.917,97 · Q2 −59.012.923,74 · Q3 +582.823.713
    const r = tinhTNDNLuyKe({
      lnTruocThue: 818_790_207.23,
      thuNhapTinhThue: 928_214_707.23,
      thueSuat: 0.15,
    });
    expect(r.thueTNDN).toBeCloseTo(139_232_206.08, 2);
    expect(r.lnSauThue).toBeCloseTo(679_558_001.15, 2);
  });

  it('thu nhập tính thuế cả năm âm → thuế = 0, LNST = LN trước thuế', () => {
    const r = tinhTNDNLuyKe({
      lnTruocThue: -500,
      thuNhapTinhThue: -300,
      thueSuat: 0.15,
    });
    expect(r.thueTNDN).toBe(0);
    expect(r.lnSauThue).toBe(-500);
  });
});
