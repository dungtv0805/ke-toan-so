import { describe, it, expect } from 'vitest';
import { resolveTerm, TERM_REGISTRY } from './termRegistry';
import type { Glossary } from '@/types/tenant';

describe('resolveTerm', () => {
  const reg = TERM_REGISTRY;

  it('không có glossary công ty → dùng registry (label + surface)', () => {
    expect(resolveTerm(undefined, reg, 'chuDauTu')).toBe('Chủ đầu tư');
    expect(resolveTerm(undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('CĐT');
    expect(resolveTerm(undefined, reg, 'chuDauTu', 'nkc.colMa')).toBe('Mã CĐT');
  });

  it('glossary công ty override label + surface', () => {
    const g: Glossary = {
      chuDauTu: { label: 'Nhà tài trợ', surfaces: { 'nkc.colTen': 'NTT' } },
    };
    expect(resolveTerm(g, reg, 'chuDauTu')).toBe('Nhà tài trợ');
    expect(resolveTerm(g, reg, 'chuDauTu', 'nkc.colTen')).toBe('NTT');
  });

  it('tenant label thắng registry surface khi tenant không có surface đó', () => {
    const g: Glossary = { chuDauTu: { label: 'Nhà tài trợ' } };
    // surface nkc.colTen: tenant không có surface → rơi xuống tenant.label (không lấy registry "CĐT")
    expect(resolveTerm(g, reg, 'chuDauTu', 'nkc.colTen')).toBe('Nhà tài trợ');
  });

  it('key không có ở đâu → trả chính key', () => {
    expect(resolveTerm(undefined, reg, 'khongCo')).toBe('khongCo');
    expect(resolveTerm(undefined, reg, 'khongCo', 'x')).toBe('khongCo');
  });
});
