import { describe, it, expect } from 'vitest';
import { tabBanDauBCTC } from './BaoCaoTaiChinhPage';

describe('tabBanDauBCTC', () => {
  it('không có ?tab thì mở Cân đối tài khoản như cũ', () => {
    expect(tabBanDauBCTC(null)).toBe('1');
  });

  it('mở đúng tab theo tên đường dẫn', () => {
    expect(tabBanDauBCTC('can-doi-tai-khoan')).toBe('1');
    expect(tabBanDauBCTC('can-doi-ke-toan')).toBe('2');
    expect(tabBanDauBCTC('ket-qua-kinh-doanh')).toBe('3');
    expect(tabBanDauBCTC('so-sanh-lai-lo')).toBe('4');
  });

  it('tab lạ rơi về mặc định, không vỡ trang', () => {
    expect(tabBanDauBCTC('luu-chuyen-tien-te')).toBe('1');
  });
});
