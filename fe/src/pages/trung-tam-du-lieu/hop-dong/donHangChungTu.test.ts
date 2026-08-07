import { describe, it, expect } from 'vitest';
import { defaultTaiKhoan, taiKhoanSnapshot } from './donHangChungTu';
import type { TaiKhoan } from '@/types';

const tk = (ma: string, ten: string): TaiKhoan =>
  ({ id: ma, ma, ten, loai: 'NO_PHAI_TRA', nhom: 'CO' }) as TaiKhoan;

describe('defaultTaiKhoan', () => {
  it('ưu tiên mã khớp chính xác', () => {
    const list = [tk('33871', 'DT chưa thực hiện A'), tk('3387', 'DT chưa thực hiện')];
    expect(defaultTaiKhoan(list, '3387')).toBe('3387');
  });

  it('không có mã chuẩn thì lấy TK con đầu tiên', () => {
    expect(defaultTaiKhoan([tk('33871', 'DT chưa thực hiện A')], '3387')).toBe('33871');
  });

  it('không có TK nào thuộc nhánh → undefined', () => {
    expect(defaultTaiKhoan([tk('131', 'Phải thu KH')], '3387')).toBeUndefined();
  });
});

describe('taiKhoanSnapshot', () => {
  it('lấy đủ tên/loại/nhóm từ danh mục', () => {
    const snap = taiKhoanSnapshot([tk('511', 'Doanh thu bán hàng')], '511');
    expect(snap).toEqual({ ma: '511', ten: 'Doanh thu bán hàng', loai: 'NO_PHAI_TRA', nhom: 'CO' });
  });

  it('TK không có trong danh mục vẫn giữ mã, không mất dòng', () => {
    expect(taiKhoanSnapshot([], '3387')).toEqual({ ma: '3387', ten: '', loai: '', nhom: '' });
  });
});
