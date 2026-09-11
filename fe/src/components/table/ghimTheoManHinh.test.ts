import { describe, it, expect } from 'vitest';
import { ghimTheoManHinh, RONG_COT_GHIM_DIEN_THOAI } from './ghimTheoManHinh';

type Cot = { key: string; fixed?: 'left' | 'right' | 'start' | 'end' | boolean; width?: number | string; ellipsis?: boolean };

const cot: Cot[] = [
  { key: 'ma', fixed: 'left', width: 120 },
  { key: 'ten', fixed: 'left', width: 230 },
  { key: 'ngay', width: 100 },
  { key: 'thaoTac', fixed: 'right', width: 90 },
];

describe('ghimTheoManHinh', () => {
  it('máy tính và máy tính bảng: trả nguyên mảng (cùng tham chiếu)', () => {
    expect(ghimTheoManHinh(cot, 'desktop')).toBe(cot);
    expect(ghimTheoManHinh(cot, 'tablet')).toBe(cot);
  });

  it('điện thoại: chỉ giữ cột ghim trái ĐẦU TIÊN, bỏ ghim phần còn lại', () => {
    const kq = ghimTheoManHinh(cot, 'mobile');
    expect(kq.map((c) => c.fixed)).toEqual(['left', undefined, undefined, undefined]);
  });

  it('cột ghim giữ lại bị thu hẹp để không chiếm hết màn điện thoại', () => {
    const rong = ghimTheoManHinh<Cot>([{ key: 'chiTieu', fixed: 'left', width: 350 }], 'mobile')!;
    expect(rong[0].width).toBe(RONG_COT_GHIM_DIEN_THOAI);
    expect(rong[0].ellipsis).toBe(true);

    const hep = ghimTheoManHinh<Cot>([{ key: 'ma', fixed: 'left', width: 90 }], 'mobile')!;
    expect(hep[0].width).toBe(90);
    expect(hep[0].ellipsis).toBeUndefined();
  });

  it('nhận cả tên antd 6 (start/end) và fixed: true', () => {
    const kq = ghimTheoManHinh<Cot>(
      [{ key: 'a', fixed: true }, { key: 'b', fixed: 'start' }, { key: 'c', fixed: 'end' }],
      'mobile',
    );
    expect(kq.map((c) => c.fixed)).toEqual([true, undefined, undefined]);
  });

  it('không có cột ghim trái nào: chỉ bỏ ghim cột phải', () => {
    const kq = ghimTheoManHinh<Cot>([{ key: 'a' }, { key: 'b', fixed: 'right' }], 'mobile');
    expect(kq.map((c) => c.fixed)).toEqual([undefined, undefined]);
  });

  it('không làm hỏng mảng đầu vào', () => {
    ghimTheoManHinh(cot, 'mobile');
    expect(cot[1].fixed).toBe('left');
  });

  it('undefined vào thì undefined ra', () => {
    expect(ghimTheoManHinh(undefined, 'mobile')).toBeUndefined();
  });
});
