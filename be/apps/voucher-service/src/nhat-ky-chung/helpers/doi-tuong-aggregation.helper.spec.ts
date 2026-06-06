import { mergeDoiTuongBuckets } from './doi-tuong-aggregation.helper';

describe('mergeDoiTuongBuckets', () => {
  it('gộp nhánh Nợ và Có theo (ma, doiTuongMa)', () => {
    const no = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'Khách A', priorNo: 100, periodNo: 50 },
    ];
    const co = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'Khách A', priorCo: 10, periodCo: 5 },
    ];
    const result = mergeDoiTuongBuckets(no, co);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ma: '131', doiTuongMa: 'KH01', doiTuongTen: 'Khách A',
      priorNo: 100, priorCo: 10, periodNo: 50, periodCo: 5,
    });
  });

  it('đối tượng khác nhau → bucket riêng', () => {
    const no = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'A', priorNo: 100, periodNo: 0 },
      { _id: { ma: '131', dt: 'KH02' }, doiTuongTen: 'B', priorNo: 200, periodNo: 0 },
    ];
    const result = mergeDoiTuongBuckets(no, []);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.doiTuongMa).sort()).toEqual(['KH01', 'KH02']);
  });

  it('thiếu đối tượng (dt = null) → giữ bucket null, lấy tên từ nhánh Có khi Nợ trống', () => {
    const co = [
      { _id: { ma: '331', dt: null }, doiTuongTen: null, priorCo: 70, periodCo: 30 },
    ];
    const result = mergeDoiTuongBuckets([], co);
    expect(result).toHaveLength(1);
    expect(result[0].doiTuongMa).toBeNull();
    expect(result[0].priorCo).toBe(70);
    expect(result[0].periodCo).toBe(30);
    expect(result[0].priorNo).toBe(0);
  });
});
