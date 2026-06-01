import { computeTrialRow } from './so-cai.service';

describe('computeTrialRow', () => {
  const zeroAgg = { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
  const zeroOpening = { duNo: 0, duCo: 0 };

  it('TK loại NO: số dư đầu kỳ thủ công cộng vào đầu kỳ và cuối kỳ', () => {
    // Opening duNo 1,000,000; phát sinh Nợ 500,000 trong kỳ
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 500000, periodCo: 0 },
      { duNo: 1000000, duCo: 0 },
      'NO',
    );
    expect(row.noDauKy).toBe(1000000);
    expect(row.coDauKy).toBe(0);
    expect(row.noPhatSinh).toBe(500000);
    expect(row.noCuoiKy).toBe(1500000);
    expect(row.coCuoiKy).toBe(0);
  });

  it('TK loại CO: opening duCo cộng vào đầu kỳ Có', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 200000 },
      { duNo: 0, duCo: 800000 },
      'CO',
    );
    expect(row.coDauKy).toBe(800000);
    expect(row.noDauKy).toBe(0);
    expect(row.coCuoiKy).toBe(1000000);
  });

  it('opening cộng dồn với prior từ chứng từ (loại NO)', () => {
    const row = computeTrialRow(
      { priorNo: 300000, priorCo: 100000, periodNo: 0, periodCo: 0 },
      { duNo: 500000, duCo: 0 },
      'NO',
    );
    // đầu kỳ = (300000+500000) - (100000+0) = 700000 dư Nợ
    expect(row.noDauKy).toBe(700000);
    expect(row.coDauKy).toBe(0);
  });

  it('opening = 0 cho kết quả như cũ', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 100000, periodCo: 0 },
      zeroOpening,
      'NO',
    );
    expect(row.noDauKy).toBe(0);
    expect(row.noCuoiKy).toBe(100000);
  });

  it('agg = 0 + opening = 0 → tất cả 0', () => {
    const row = computeTrialRow(zeroAgg, zeroOpening, 'NO');
    expect(row).toEqual({
      noDauKy: 0,
      coDauKy: 0,
      noPhatSinh: 0,
      coPhatSinh: 0,
      noCuoiKy: 0,
      coCuoiKy: 0,
    });
  });
});
