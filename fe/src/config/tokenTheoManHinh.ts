import type { ThemeConfig } from 'antd';
import type { ManHinh } from './manHinh';

type Token = NonNullable<ThemeConfig['token']>;

/**
 * Token antd ghi đè theo loại màn hình — trộn lên trên theme gốc ở App.tsx.
 *
 * Theme gốc (chữ 11px, control 28px) là mật độ cho chuột trên màn máy tính;
 * dùng ngón tay thì nút 28px khó bấm trúng và chữ 11px khó đọc. Máy tính bảng
 * chỉ tăng khi thật sự là màn cảm ứng — cửa sổ laptop kéo hẹp vẫn dùng chuột.
 */
export function tokenTheoManHinh(manHinh: ManHinh, camUng: boolean): Partial<Token> {
  if (manHinh === 'mobile') {
    return { fontSize: 13, fontSizeSM: 12, controlHeight: 36, controlHeightSM: 30, controlHeightLG: 44 };
  }
  if (manHinh === 'tablet' && camUng) {
    return { fontSize: 12, fontSizeSM: 11, controlHeight: 32, controlHeightSM: 30, controlHeightLG: 40 };
  }
  return {};
}
