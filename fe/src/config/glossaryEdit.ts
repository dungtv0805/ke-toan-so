import type { Glossary } from '@/types/tenant';

export type EditScope = 'all' | 'surface';

/**
 * Trả glossary MỚI (deep-copy) sau khi sửa 1 nhãn.
 * - scope 'all'    → ghi entry.label = value.
 * - scope 'surface'→ ghi entry.surfaces[surface] = value, đảm bảo entry.label có (baseLabelFallback).
 */
export function applyGlossaryEdit(
  glossary: Glossary | undefined,
  baseLabelFallback: string,
  key: string,
  value: string,
  scope: EditScope,
  surface?: string,
): Glossary {
  const next: Glossary = JSON.parse(JSON.stringify(glossary ?? {}));
  const entry = next[key] ?? { label: baseLabelFallback };
  if (scope === 'surface' && surface) {
    entry.surfaces = { ...(entry.surfaces ?? {}), [surface]: value };
    if (!entry.label) entry.label = baseLabelFallback;
  } else {
    entry.label = value;
  }
  next[key] = entry;
  return next;
}
