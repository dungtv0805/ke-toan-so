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
 * tenant.surfaces[surface] → tenant.label → registry.surfaces[surface] → registry.label → key
 */
export function resolveTerm(
  glossary: Glossary | undefined,
  registry: Glossary,
  key: string,
  surface?: string,
): string {
  const tenant = glossary?.[key];
  if (surface && tenant?.surfaces?.[surface]) return tenant.surfaces[surface];
  if (tenant?.label) return tenant.label;
  const def = registry?.[key];
  if (surface && def?.surfaces?.[surface]) return def.surfaces[surface];
  if (def?.label) return def.label;
  return key;
}
