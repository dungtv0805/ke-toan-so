// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { manHinhTheoBeRong, MOBILE_MAX, TABLET_MAX } from '@/config/manHinh';
import { useManHinh } from './useManHinh';
import { useIsMobile } from './use-mobile';

const datBeRong = (w: number) => {
  Object.defineProperty(window, 'innerWidth', { value: w, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
};

afterEach(() => datBeRong(1440));

describe('manHinhTheoBeRong', () => {
  it('ranh giới trùng Tailwind md (768) và xl (1280)', () => {
    expect(MOBILE_MAX).toBe(767);
    expect(TABLET_MAX).toBe(1279);
    expect(manHinhTheoBeRong(375)).toBe('mobile');
    expect(manHinhTheoBeRong(767)).toBe('mobile');
    expect(manHinhTheoBeRong(768)).toBe('tablet');
    expect(manHinhTheoBeRong(1279)).toBe('tablet');
    expect(manHinhTheoBeRong(1280)).toBe('desktop');
  });

  it('điện thoại XOAY NGANG (rộng 844–932, cao ≤ 540) vẫn là điện thoại', () => {
    expect(manHinhTheoBeRong(844, 390)).toBe('mobile');
    expect(manHinhTheoBeRong(932, 430)).toBe('mobile');
    // iPad ngang cao ≥ 744 → vẫn máy tính bảng; màn máy tính thấp vẫn là máy tính
    expect(manHinhTheoBeRong(1180, 820)).toBe('tablet');
    expect(manHinhTheoBeRong(1024, 744)).toBe('tablet');
    expect(manHinhTheoBeRong(1440, 500)).toBe('desktop');
  });
});

describe('useManHinh', () => {
  it('đúng ngay lần render ĐẦU — không nháy qua desktop trên điện thoại', () => {
    datBeRong(390);
    const lanDau: string[] = [];
    renderHook(() => {
      const m = useManHinh();
      lanDau.push(m);
      return m;
    });
    expect(lanDau[0]).toBe('mobile');
  });

  it('đổi theo cỡ cửa sổ', () => {
    datBeRong(1440);
    const { result } = renderHook(() => useManHinh());
    expect(result.current).toBe('desktop');
    act(() => datBeRong(900));
    expect(result.current).toBe('tablet');
    act(() => datBeRong(400));
    expect(result.current).toBe('mobile');
  });

  it('useIsMobile dựa trên cùng ngưỡng, đúng ngay lần đầu', () => {
    datBeRong(500);
    const lanDau: boolean[] = [];
    renderHook(() => {
      const v = useIsMobile();
      lanDau.push(v);
      return v;
    });
    expect(lanDau[0]).toBe(true);
  });
});
