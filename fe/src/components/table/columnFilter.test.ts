import { describe, it, expect } from 'vitest';
import { isActiveFilter, matchText, type ColumnFilter } from './columnFilter';

const f = (op: ColumnFilter['op'], value: string): ColumnFilter => ({ op, value });

describe('matchText', () => {
  it('Chứa: khớp chuỗi con, không phân biệt hoa thường', () => {
    expect(matchText('CÔNG TY G-LIFE', f('contains', 'g-life'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', f('contains', 'vinamilk'))).toBe(false);
  });

  it('Chứa: bỏ dấu tiếng Việt ở cả hai phía', () => {
    expect(matchText('CÔNG TY CỔ PHẦN', f('contains', 'cong ty'))).toBe(true);
    expect(matchText('Cong ty co phan', f('contains', 'cổ phần'))).toBe(true);
    expect(matchText('Nguyễn Văn Đức', f('contains', 'duc'))).toBe(true);
  });

  it('Không chứa: phủ định của Chứa', () => {
    expect(matchText('CÔNG TY G-LIFE', f('notContains', 'vinamilk'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', f('notContains', 'g-life'))).toBe(false);
  });

  it('Bằng: khớp toàn bộ chuỗi (đã trim, bỏ dấu, hạ hoa thường)', () => {
    expect(matchText(' KH001 ', f('equals', 'kh001'))).toBe(true);
    expect(matchText('KH0011', f('equals', 'kh001'))).toBe(false);
  });

  it('Bắt đầu bằng', () => {
    expect(matchText('KH001', f('startsWith', 'kh'))).toBe(true);
    expect(matchText('NCC001', f('startsWith', 'kh'))).toBe(false);
  });

  it('giá trị lọc rỗng hoặc chỉ khoảng trắng → không lọc, mọi dòng đều khớp', () => {
    expect(matchText('bất kỳ', f('contains', ''))).toBe(true);
    expect(matchText('bất kỳ', f('equals', '   '))).toBe(true);
  });

  it('ô nguồn rỗng/undefined: chỉ khớp Không chứa', () => {
    expect(matchText(undefined, f('contains', 'a'))).toBe(false);
    expect(matchText('', f('equals', 'a'))).toBe(false);
    expect(matchText(undefined, f('notContains', 'a'))).toBe(true);
  });
});

describe('isActiveFilter', () => {
  it('chỉ coi là đang lọc khi có giá trị thực', () => {
    expect(isActiveFilter(undefined)).toBe(false);
    expect(isActiveFilter(f('contains', ''))).toBe(false);
    expect(isActiveFilter(f('contains', '  '))).toBe(false);
    expect(isActiveFilter(f('contains', 'a'))).toBe(true);
  });
});
