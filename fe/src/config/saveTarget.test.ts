import { describe, it, expect } from 'vitest';
import { buildSaveOptions } from './saveTarget';

describe('buildSaveOptions', () => {
  it('SuperAdmin + lĩnh vực + surface → 4 lựa chọn, mặc định cả lĩnh vực chỉ chỗ này', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: true, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-surface', 'nganh-all', 'tenant-surface', 'tenant-all']);
    expect(opts[0].target).toBe('nganh');
    expect(opts[0].scope).toBe('surface');
    expect(opts[0].label).toContain('Xây dựng');
  });

  it('SuperAdmin + lĩnh vực, không surface → mặc định cả lĩnh vực mọi nơi', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: false, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-all', 'tenant-all']);
    expect(opts[0].scope).toBe('all');
  });

  it('không phải SuperAdmin + surface → chỉ tenant, mặc định chỉ chỗ này', () => {
    const opts = buildSaveOptions({ isSuperAdmin: false, hasNganh: true, hasSurface: true });
    expect(opts.map((o) => o.value)).toEqual(['tenant-surface', 'tenant-all']);
    expect(opts[0].scope).toBe('surface');
  });

  it('SuperAdmin nhưng không có lĩnh vực → chỉ tenant', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: false, hasSurface: false });
    expect(opts.map((o) => o.value)).toEqual(['tenant-all']);
  });
});
