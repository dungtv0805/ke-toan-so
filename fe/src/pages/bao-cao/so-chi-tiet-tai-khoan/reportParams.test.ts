import { describe, it, expect } from 'vitest';
import { parseReportParams } from './reportParams';

function getterFrom(obj: Record<string, string>) {
  return (key: string) => (key in obj ? obj[key] : null);
}

describe('parseReportParams', () => {
  it('không có gì → object rỗng', () => {
    expect(parseReportParams(getterFrom({}))).toEqual({});
  });

  it('trích đủ TK, đối tượng, kỳ', () => {
    const parsed = parseReportParams(
      getterFrom({
        maTaiKhoan: '131',
        maDoiTuong: 'KH01',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z',
      }),
    );
    expect(parsed).toEqual({
      maTaiKhoan: '131',
      maDoiTuong: 'KH01',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T23:59:59.999Z',
    });
  });

  it('bỏ qua key rỗng', () => {
    const parsed = parseReportParams(getterFrom({ maTaiKhoan: '111', maDoiTuong: '' }));
    expect(parsed).toEqual({ maTaiKhoan: '111' });
    expect('maDoiTuong' in parsed).toBe(false);
  });
});
