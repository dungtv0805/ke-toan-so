import { describe, it, expect } from 'vitest';
import { nhomTheoPhanHe, tabBanDau } from './KeHoachTabsPage';

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

/**
 * Mỗi phân hệ có Kế hoạch / Dự báo RIÊNG (menu dọc chia theo phân hệ) — mở từ menu
 * phân hệ nào thì trang chỉ còn bảng của phân hệ đó, không kèm tab của phân hệ khác.
 */
describe('nhomTheoPhanHe', () => {
  it('Bán hàng / Tiền lương / Tài sản / Tổng hợp / Phân tích: đúng một bảng', () => {
    expect(nhomTheoPhanHe('ban-hang')?.tabs).toEqual(['ban-hang']);
    expect(nhomTheoPhanHe('nhan-su')?.tabs).toEqual(['nhan-su']);
    expect(nhomTheoPhanHe('tai-san')?.tabs).toEqual(['tai-san']);
    expect(nhomTheoPhanHe('chi-tiet')?.tabs).toEqual(['chi-tiet']);
    expect(nhomTheoPhanHe('kqkd')?.tabs).toEqual(['kqkd']);
  });

  // Nguồn vốn không có mục menu riêng — ghép với Dòng tiền trong phân hệ Vốn &
  // dòng tiền, nếu không bỏ thanh tab là bảng Nguồn vốn mất lối vào.
  it('Vốn & dòng tiền gồm Dòng tiền + Nguồn vốn, vào từ tab nào cũng cùng nhóm', () => {
    expect(nhomTheoPhanHe('dong-tien')?.tabs).toEqual(['dong-tien', 'nguon-von']);
    expect(nhomTheoPhanHe('nguon-von')?.tabs).toEqual(['dong-tien', 'nguon-von']);
  });

  it('tiêu đề theo phân hệ và theo Kế hoạch / Dự báo', () => {
    expect(nhomTheoPhanHe('ban-hang')?.tieuDe('KE_HOACH')).toBe('Kế hoạch bán hàng');
    expect(nhomTheoPhanHe('dong-tien')?.tieuDe('DU_BAO')).toBe('Dự báo vốn & dòng tiền');
    expect(nhomTheoPhanHe('kqkd')?.tieuDe('DU_BAO')).toBe('P&L Dự báo');
    expect(nhomTheoPhanHe('chi-tiet')?.tieuDe('KE_HOACH')).toBe('Chi tiết kế hoạch');
  });

  it('không có ?tab (vào thẳng trang) hoặc tab lạ → null = hiện đủ các tab như cũ', () => {
    expect(nhomTheoPhanHe(null)).toBeNull();
    expect(nhomTheoPhanHe('khong-co')).toBeNull();
  });

  it('mọi tab hợp lệ đều thuộc đúng một nhóm — không bảng nào mất lối vào', () => {
    for (const tab of ['ban-hang', 'nhan-su', 'kqkd', 'dong-tien', 'tai-san', 'nguon-von', 'chi-tiet']) {
      expect(nhomTheoPhanHe(tab)?.tabs).toContain(tab);
    }
  });
});
