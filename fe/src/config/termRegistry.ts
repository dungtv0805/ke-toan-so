import type { Glossary } from '@/types/tenant';

/** Glossary mặc định hệ thống (fallback cuối). Mở rộng thêm term tại đây. */
export const TERM_REGISTRY: Glossary = {
  chuDauTu: {
    label: 'Chủ đầu tư',
    surfaces: { 'nkc.colMa': 'Mã CĐT', 'nkc.colTen': 'CĐT' },
  },
};

/**
 * Giải nhãn theo chuỗi fallback:
 * tenant.surfaces[surface] → tenant.label
 * → nganh.surfaces[surface] → nganh.label
 * → registry.surfaces[surface] → registry.label → key
 */
export function resolveTerm(
  tenantGlossary: Glossary | undefined,
  nganhGlossary: Glossary | undefined,
  registry: Glossary,
  key: string,
  surface?: string,
): string {
  for (const g of [tenantGlossary, nganhGlossary, registry]) {
    const entry = g?.[key];
    if (!entry) continue;
    if (surface && entry.surfaces?.[surface]) return entry.surfaces[surface];
    if (entry.label) return entry.label;
  }
  return key;
}
