import { describe, it, expect } from 'vitest';
import { applyGlossaryEdit } from './glossaryEdit';
import type { Glossary } from '@/types/tenant';

describe('applyGlossaryEdit', () => {
  it("scope 'all' ghi label, không đụng nguồn (deep copy)", () => {
    const g: Glossary = { chuDauTu: { label: 'Chủ đầu tư' } };
    const next = applyGlossaryEdit(g, 'Chủ đầu tư', 'chuDauTu', 'Nhà tài trợ', 'all');
    expect(next.chuDauTu.label).toBe('Nhà tài trợ');
    expect(g.chuDauTu.label).toBe('Chủ đầu tư'); // nguồn không đổi
  });

  it("scope 'surface' ghi surface, giữ label nền", () => {
    const g: Glossary = { chuDauTu: { label: 'Chủ đầu tư' } };
    const next = applyGlossaryEdit(g, 'Chủ đầu tư', 'chuDauTu', 'NTT', 'surface', 'nkc.colTen');
    expect(next.chuDauTu.surfaces?.['nkc.colTen']).toBe('NTT');
    expect(next.chuDauTu.label).toBe('Chủ đầu tư');
  });

  it('tạo entry mới khi term chưa có: dùng baseLabelFallback làm label nền', () => {
    const next = applyGlossaryEdit(undefined, 'Chủ đầu tư', 'chuDauTu', 'CĐT2', 'surface', 'nkc.colTen');
    expect(next.chuDauTu.label).toBe('Chủ đầu tư');
    expect(next.chuDauTu.surfaces?.['nkc.colTen']).toBe('CĐT2');
  });

  it("scope 'all' trên glossary rỗng tạo entry với label mới", () => {
    const next = applyGlossaryEdit({}, 'Chủ đầu tư', 'chuDauTu', 'Nhà tài trợ', 'all');
    expect(next.chuDauTu).toEqual({ label: 'Nhà tài trợ' });
  });
});
