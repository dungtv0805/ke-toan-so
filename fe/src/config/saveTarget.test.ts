import { describe, it, expect } from 'vitest';
import { buildSaveOptions } from './saveTarget';

describe('buildSaveOptions', () => {
  it('SuperAdmin + có lĩnh vực + có surface → 3 lựa chọn, mặc định lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: true, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-all', 'tenant-all', 'tenant-surface']);
    expect(opts[0].label).toBe('Cả lĩnh vực (Xây dựng)');
    expect(opts[0].target).toBe('nganh');
    expect(opts[0].scope).toBe('all');
  });

  it('không phải SuperAdmin → không có lựa chọn lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: false, hasNganh: true, hasSurface: true, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['tenant-all', 'tenant-surface']);
  });

  it('không có surface → bỏ lựa chọn "chỉ chỗ này"', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: false, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-all', 'tenant-all']);
  });

  it('SuperAdmin nhưng tenant không thuộc lĩnh vực nào → không có lựa chọn lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: false, hasSurface: false });
    expect(opts.map((o) => o.value)).toEqual(['tenant-all']);
  });
});
