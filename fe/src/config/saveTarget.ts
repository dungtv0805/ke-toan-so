import type { EditScope } from './glossaryEdit';

export type SaveTarget = 'nganh' | 'tenant';

export interface SaveOption {
  value: 'nganh-all' | 'tenant-all' | 'tenant-surface';
  label: string;
  target: SaveTarget;
  scope: EditScope;
}

export function buildSaveOptions(args: {
  isSuperAdmin: boolean;
  hasNganh: boolean;
  hasSurface: boolean;
  nganhName?: string;
}): SaveOption[] {
  const out: SaveOption[] = [];
  if (args.isSuperAdmin && args.hasNganh) {
    const ten = args.nganhName ? ` (${args.nganhName})` : '';
    out.push({ value: 'nganh-all', label: `Cả lĩnh vực${ten}`, target: 'nganh', scope: 'all' });
  }
  out.push({ value: 'tenant-all', label: 'Chỉ công ty này', target: 'tenant', scope: 'all' });
  if (args.hasSurface) {
    out.push({ value: 'tenant-surface', label: 'Chỉ ở chỗ này', target: 'tenant', scope: 'surface' });
  }
  return out;
}
