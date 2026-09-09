import { describe, it, expect } from 'vitest';
import { tabBanDau } from './KeHoachTabsPage';

describe('tabBanDau', () => {
  it('không có ?tab thì mở Bán hàng như cũ', () => {
    expect(tabBanDau(null)).toBe('ban-hang');
  });

  it('?tab= rỗng thì mở Bán hàng như cũ', () => {
    expect(tabBanDau('')).toBe('ban-hang');
  });

  it('mở đúng tab được yêu cầu', () => {
    expect(tabBanDau('nhan-su')).toBe('nhan-su');
    expect(tabBanDau('dong-tien')).toBe('dong-tien');
  });

  it('tab lạ thì rơi về Bán hàng, không vỡ trang', () => {
    expect(tabBanDau('khong-co-tab-nay')).toBe('ban-hang');
  });
});
