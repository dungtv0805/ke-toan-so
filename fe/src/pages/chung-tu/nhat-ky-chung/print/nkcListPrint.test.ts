import { describe, it, expect } from 'vitest';
import { buildNkcListHtml } from './nkcListPrint';
import type { NhatKyChung } from '@/types';

const entry = (over: Partial<NhatKyChung> = {}): NhatKyChung =>
  ({
    id: '1',
    ngay: '2026-03-15',
    soPhieu: 'NKC001',
    dienGiai: 'Chi tiền',
    taiKhoanNo: '642',
    taiKhoanCo: '111',
    soTien: 1_000_000,
    ...over,
  }) as NhatKyChung;

describe('buildNkcListHtml', () => {
  it('in đủ số dòng và cộng đúng tổng tiền', () => {
    const html = buildNkcListHtml([
      entry(),
      entry({ id: '2', soPhieu: 'NKC002', soTien: 500_000 }),
    ]);

    expect(html).toContain('NKC001');
    expect(html).toContain('NKC002');
    expect(html).toContain('Cộng 2 bút toán');
    expect(html).toContain('1.500.000');
  });

  it('hiện khoảng ngày lọc theo định dạng dd/mm/yyyy', () => {
    const html = buildNkcListHtml([entry()], {
      tuNgay: '2026-01-01',
      denNgay: '2026-03-31',
    });
    expect(html).toContain('Từ ngày 01/01/2026 đến ngày 31/03/2026');
  });

  it('không lọc ngày thì ghi "Toàn bộ kỳ"', () => {
    expect(buildNkcListHtml([entry()])).toContain('Toàn bộ kỳ');
  });

  it('escape ký tự HTML trong diễn giải để không vỡ bản in', () => {
    const html = buildNkcListHtml([
      entry({ dienGiai: '<script>alert(1)</script> A & B' }),
    ]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('in tên công ty ở đầu trang', () => {
    const html = buildNkcListHtml([entry()], { tenCongTy: 'CÔNG TY ABC' });
    expect(html).toContain('CÔNG TY ABC');
  });
});
