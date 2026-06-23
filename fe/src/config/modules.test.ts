import { describe, it, expect } from 'vitest';
import { moduleOfMenuKey, getAvailableModules, MODULE_CODES } from './modules';

describe('moduleOfMenuKey', () => {
  it('mục dùng chung → COMMON', () => {
    expect(moduleOfMenuKey('/')).toBe('COMMON');
    expect(moduleOfMenuKey('/quy-trinh')).toBe('COMMON');
    expect(moduleOfMenuKey('/huong-dan')).toBe('COMMON');
  });

  it('mục kho (gồm con theo tiền tố) → KHO', () => {
    expect(moduleOfMenuKey('/kho/nhap-kho')).toBe('KHO');
    expect(moduleOfMenuKey('/kho/xuat-kho')).toBe('KHO');
    expect(moduleOfMenuKey('/phan-tich/ton-kho')).toBe('KHO');
    expect(moduleOfMenuKey('/danh-muc/hang-hoa-vat-tu')).toBe('KHO');
    expect(moduleOfMenuKey('/chung-tu/phieu-nhap')).toBe('KHO');
  });

  it('mặc định mục khác → KE_TOAN', () => {
    expect(moduleOfMenuKey('/bao-cao/tai-chinh')).toBe('KE_TOAN');
    expect(moduleOfMenuKey('/chung-tu/phieu-thu')).toBe('KE_TOAN');
    expect(moduleOfMenuKey('/danh-muc/tai-khoan')).toBe('KE_TOAN');
  });

  it('không nhầm /danh-muc/kho (kế toán catalog kho) với prefix /kho', () => {
    // /danh-muc/kho được khai báo riêng là KHO
    expect(moduleOfMenuKey('/danh-muc/kho')).toBe('KHO');
    // nhưng /danh-muc/khoan-muc KHÔNG bị nuốt bởi prefix /danh-muc/kho
    expect(moduleOfMenuKey('/danh-muc/khoan-muc')).toBe('KE_TOAN');
  });
});

describe('getAvailableModules', () => {
  it('SuperAdmin thấy toàn bộ catalog', () => {
    expect(getAvailableModules(['KE_TOAN'], true)).toEqual(MODULE_CODES);
  });

  it('user thường theo modules công ty', () => {
    expect(getAvailableModules(['KE_TOAN', 'KHO'], false)).toEqual(['KE_TOAN', 'KHO']);
    expect(getAvailableModules(['KHO'], false)).toEqual(['KHO']);
  });

  it('thiếu/không hợp lệ → mặc định KE_TOAN', () => {
    expect(getAvailableModules(undefined, false)).toEqual(['KE_TOAN']);
    expect(getAvailableModules([], false)).toEqual(['KE_TOAN']);
    expect(getAvailableModules(['XXX'], false)).toEqual(['KE_TOAN']);
  });
});
