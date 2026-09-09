// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { moduleTheoPath, useSidebarState, KHOA_THU_GON } from './useSidebarState';

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
});

describe('useSidebarState', () => {
  beforeEach(() => localStorage.clear());

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
});
