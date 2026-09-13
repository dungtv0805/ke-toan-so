import { describe, it, expect } from 'vitest';
import { cotKqkd } from './KqkdTable';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';
import { COT_KY } from '../lib/kyCot';

const cot = (dienThoai = false) => cotKqkd(dienThoai, null);

describe('cotKqkd', () => {
  it('ghim cột Chỉ tiêu bên trái ở MỌI cỡ màn', () => {
    // 19 cụm kỳ: vuốt sang cột tháng mà mất tên dòng thì bảng vô dụng.
    for (const dienThoai of [false, true]) {
      expect(cot(dienThoai)[0]).toMatchObject({ key: 'nhan', fixed: 'left' });
    }
  });

  it('điện thoại hẹp cột Chỉ tiêu lại cho vừa màn', () => {
    expect(cot(false)[0].width).toBe(320);
    expect(cot(true)[0].width).toBe(RONG_COT_GHIM_DIEN_THOAI);
  });

  it('mỗi kỳ là một cụm ba cột Số tiền · %DS · Tỷ trọng', () => {
    const cum = cot().slice(1);
    expect(cum).toHaveLength(COT_KY.length);
    for (const c of cum) {
      const con = (c as { children?: { title?: unknown }[] }).children ?? [];
      expect(con.map((x) => x.title)).toEqual(['Số tiền', '%DS', 'Tỷ trọng']);
    }
  });

  it('kỳ xếp từ rộng tới hẹp, không còn cụm gộp Quý/Tháng', () => {
    const nhan = cot().map((c) => c.title);
    expect(nhan).toEqual(['Chỉ tiêu', ...COT_KY.map((k) => k.title)]);
    expect(nhan).not.toContain('Quý');
    expect(nhan).not.toContain('Tháng');
  });

  it('khoá cột duy nhất trong cả bảng — antd đòi vậy', () => {
    const khoa = cot().flatMap((c) => {
      const con = (c as { children?: { key?: React.Key }[] }).children;
      return con ? con.map((x) => x.key) : [c.key];
    });
    expect(new Set(khoa).size).toBe(khoa.length);
  });
});
