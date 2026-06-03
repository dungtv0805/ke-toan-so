import { computeRelevantCodes } from './so-chi-tiet.helper';

describe('computeRelevantCodes', () => {
  const accounts = [
    { ma: '131' },
    { ma: '1311' },
    { ma: '1312' },
    { ma: '111' },
    { ma: '1111' },
  ];

  it('TK leaf chỉ trả về chính nó', () => {
    const set = computeRelevantCodes(accounts, '1311');
    expect([...set].sort()).toEqual(['1311']);
  });

  it('TK cha gồm chính nó và mọi con cháu theo tiền tố', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect([...set].sort()).toEqual(['131', '1311', '1312']);
  });

  it('không gộp nhầm tài khoản khác nhánh', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect(set.has('111')).toBe(false);
    expect(set.has('1111')).toBe(false);
  });
});
