import { useSyncExternalStore } from 'react';
import { manHinhTheoBeRong, type ManHinh } from '@/config/manHinh';

const dangKy = (bao: () => void) => {
  window.addEventListener('resize', bao);
  window.addEventListener('orientationchange', bao);
  return () => {
    window.removeEventListener('resize', bao);
    window.removeEventListener('orientationchange', bao);
  };
};

const docManHinh = (): ManHinh => manHinhTheoBeRong(window.innerWidth, window.innerHeight);

/**
 * Loại màn hình hiện tại: 'mobile' (< 768, hoặc điện thoại xoay ngang) ·
 * 'tablet' (768–1279) · 'desktop' — ngưỡng xem config/manHinh.ts.
 *
 * Đọc ĐỒNG BỘ ngay lần render đầu (useSyncExternalStore) — bản cũ khởi tạo
 * `false` rồi mới sửa trong useEffect, nên điện thoại vẽ sidebar desktop một
 * khung hình trước khi đổi sang drawer. Snapshot là chuỗi nên kéo cửa sổ chỉ
 * render lại khi vượt ngưỡng, không phải mỗi pixel.
 */
export function useManHinh(): ManHinh {
  return useSyncExternalStore(dangKy, docManHinh, () => 'desktop');
}

const docCamUng = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/** Thiết bị chính là màn cảm ứng (ngón tay) — cần nút/ô nhập to hơn. */
export function useManCamUng(): boolean {
  return useSyncExternalStore(dangKy, docCamUng, () => false);
}
