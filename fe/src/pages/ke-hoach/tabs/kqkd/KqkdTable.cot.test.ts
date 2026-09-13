import { describe, it, expect } from 'vitest';
import { cotKqkd } from './KqkdTable';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';

describe('cotKqkd', () => {
  it('ghim cột Chỉ tiêu bên trái ở MỌI cỡ màn', () => {
    // 19 cột kỳ: vuốt sang cột tháng mà mất tên dòng thì bảng vô dụng.
    for (const dienThoai of [false, true]) {
      expect(cotKqkd(dienThoai)[0]).toMatchObject({
        key: 'nhan',
        fixed: 'left',
      });
    }
  });

  it('điện thoại hẹp cột Chỉ tiêu lại cho vừa màn', () => {
    expect(cotKqkd(false)[0].width).toBe(320);
    expect(cotKqkd(true)[0].width).toBe(RONG_COT_GHIM_DIEN_THOAI);
  });

  it('giữ nguyên bộ cột kỳ: Năm · % · hai nửa năm · nhóm Quý · nhóm Tháng', () => {
    expect(cotKqkd(false).map((c) => c.key)).toEqual([
      'nhan',
      'nam',
      'phanTram',
      'sauThangDau',
      'sauThangCuoi',
      'quy',
      'thang',
    ]);
  });
});
