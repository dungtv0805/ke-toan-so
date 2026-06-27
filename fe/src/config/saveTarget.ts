import type { EditScope } from './glossaryEdit';

export type SaveTarget = 'nganh' | 'tenant';

export interface SaveOption {
  value: 'nganh-surface' | 'nganh-all' | 'tenant-surface' | 'tenant-all';
  label: string;
  target: SaveTarget;
  scope: EditScope;
}

/**
 * Lựa chọn phạm vi lưu nhãn. Thứ tự: phần tử đầu là MẶC ĐỊNH.
 * Khi sửa 1 chỗ cụ thể (có surface) → mặc định "chỉ chỗ này" (an toàn, không gom cột khác).
 * SuperAdmin có thêm đích "Cả lĩnh vực" (ghi nganh.glossary).
 */
export function buildSaveOptions(args: {
  isSuperAdmin: boolean;
  hasNganh: boolean;
  hasSurface: boolean;
  nganhName?: string;
}): SaveOption[] {
  const out: SaveOption[] = [];
  const ten = args.nganhName ? ` (${args.nganhName})` : '';
  if (args.isSuperAdmin && args.hasNganh) {
    if (args.hasSurface) {
      out.push({ value: 'nganh-surface', label: `Cả lĩnh vực${ten} — chỉ chỗ này`, target: 'nganh', scope: 'surface' });
    }
    out.push({ value: 'nganh-all', label: `Cả lĩnh vực${ten} — mọi nơi`, target: 'nganh', scope: 'all' });
  }
  if (args.hasSurface) {
    out.push({ value: 'tenant-surface', label: 'Chỉ công ty này — chỉ chỗ này', target: 'tenant', scope: 'surface' });
  }
  out.push({ value: 'tenant-all', label: 'Chỉ công ty này — mọi nơi', target: 'tenant', scope: 'all' });
  return out;
}
