import { describe, it, expect } from 'vitest';
import { locMuc } from './useVisibleMenu';
import type { MenuLeaf } from '@/config/menuCatalog';

const muc = (key: string, extra: Partial<MenuLeaf> = {}): MenuLeaf => ({
  key, label: key, module: 'kho', status: 'ok', ...extra,
});

describe('locMuc', () => {
  it('SuperAdmin thấy hết, bỏ qua cả lĩnh vực lẫn quyền', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/kho/xuat-kho')];
    expect(locMuc(ds, [], () => false, true)).toHaveLength(2);
  });

  it('ẩn mục ngoài lĩnh vực của tenant', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/thue/tong-hop')];
    const ra = locMuc(ds, ['/kho'], () => true, false);
    expect(ra.map((l) => l.key)).toEqual(['/kho/nhap-kho']);
  });

  it('ẩn mục không có quyền xem', () => {
    const ds = [muc('/kho/nhap-kho'), muc('/kho/xuat-kho')];
    const ra = locMuc(ds, ['/kho'], (p) => p === '/kho/nhap-kho:xem', false);
    expect(ra.map((l) => l.key)).toEqual(['/kho/nhap-kho']);
  });

  it('mục mang query string xin quyền theo permKey, không theo key', () => {
    const ds = [
      muc('/trung-tam-du-lieu/ke-hoach?tab=nhan-su', {
        permKey: '/trung-tam-du-lieu/ke-hoach',
      }),
    ];
    const ra = locMuc(
      ds,
      ['/trung-tam-du-lieu/ke-hoach'],
      (p) => p === '/trung-tam-du-lieu/ke-hoach:xem',
      false,
    );
    expect(ra).toHaveLength(1);
  });

  it('mục soon vẫn hiện dù chưa ai được cấp quyền cho nó', () => {
    const ds = [muc('/kho/tinh-gia-xuat', { status: 'soon' })];
    expect(locMuc(ds, ['/kho'], () => false, false)).toHaveLength(1);
  });

  it('mục legacy không bao giờ hiện', () => {
    const ds = [muc('/bao-cao/so-cai', { legacy: true })];
    expect(locMuc(ds, ['/bao-cao'], () => true, false)).toEqual([]);
  });
});
