// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  moduleTheoPath,
  useSidebarState,
  laManHinhNhapLieu,
  KHOA_THU_GON,
} from './useSidebarState';

describe('moduleTheoPath', () => {
  it('tìm ra phân hệ của một trang', () => {
    expect(moduleTheoPath('/kho/nhap-kho')).toBe('kho');
    expect(moduleTheoPath('/thue/tong-hop')).toBe('thue');
    expect(moduleTheoPath('/')).toBe('tong-quan');
  });

  it('trang con không khai trong menu thì quy về phân hệ của trang cha', () => {
    expect(moduleTheoPath('/kho/nhap-kho/tao-moi')).toBe('kho');
  });

  it('đường dẫn lạ hoắc trả undefined', () => {
    expect(moduleTheoPath('/khong-ton-tai')).toBeUndefined();
  });

  it('cùng pathname Kế hoạch/Dự báo thì phân hệ theo đúng ?tab=', () => {
    expect(moduleTheoPath('/trung-tam-du-lieu/ke-hoach', '?tab=kqkd')).toBe('phan-tich');
    expect(moduleTheoPath('/trung-tam-du-lieu/ke-hoach', '?tab=chi-tiet')).toBe('tong-hop');
    expect(moduleTheoPath('/trung-tam-du-lieu/ke-hoach', '?tab=ban-hang')).toBe('ban-hang');
    expect(moduleTheoPath('/trung-tam-du-lieu/du-bao', '?tab=nhan-su&trang=2')).toBe('tien-luong');
    expect(moduleTheoPath('/trung-tam-du-lieu/du-bao', '?tab=tai-san')).toBe('tai-san');
  });

  it('thư viện riêng của phân hệ thuộc đúng phân hệ đó, thư viện chung thuộc Thư viện', () => {
    expect(moduleTheoPath('/kho/quy-trinh')).toBe('kho');
    expect(moduleTheoPath('/tong-hop/huong-dan')).toBe('tong-hop');
    expect(moduleTheoPath('/quy-trinh')).toBe('thu-vien');
  });
});

describe('laManHinhNhapLieu', () => {
  it('nhận diện màn tạo mới và sửa', () => {
    expect(laManHinhNhapLieu('/kho/nhap-kho/tao-moi')).toBe(true);
    expect(laManHinhNhapLieu('/kho/nhap-kho/abc123/sua')).toBe(true);
  });

  it('màn danh sách/xem thường không tính', () => {
    expect(laManHinhNhapLieu('/kho/nhap-kho')).toBe(false);
    expect(laManHinhNhapLieu('/')).toBe(false);
  });
});

describe('useSidebarState', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('mặc định mở panel', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    expect(result.current.thuGon).toBe(false);
  });

  it('nhớ trạng thái thu gọn theo từng người dùng', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    act(() => result.current.datThuGon(true));
    expect(localStorage.getItem(KHOA_THU_GON('u1'))).toBe('true');

    const khac = renderHook(() => useSidebarState('u2'));
    expect(khac.result.current.thuGon).toBe(false);
  });

  it('vào thẳng một màn nhập liệu thì khởi tạo ở trạng thái thu gọn', () => {
    window.history.pushState({}, '', '/kho/nhap-kho/tao-moi');
    const { result } = renderHook(() => useSidebarState('u1'));
    expect(result.current.thuGon).toBe(true);
  });

  it('điều hướng SANG màn nhập liệu thì tự thu gọn', () => {
    const { result, rerender } = renderHook(
      ({ pathname }) => useSidebarState('u1', pathname),
      { initialProps: { pathname: '/kho/nhap-kho' } },
    );
    expect(result.current.thuGon).toBe(false);

    rerender({ pathname: '/kho/nhap-kho/tao-moi' });
    expect(result.current.thuGon).toBe(true);
  });
});
