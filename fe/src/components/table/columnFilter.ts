/** Toán tử lọc cho cột chữ. */
export type FilterOp = 'contains' | 'notContains' | 'equals' | 'startsWith';

export interface ColumnFilter {
  op: FilterOp;
  value: string;
}

/** Bộ lọc đang áp trên bảng: key cột → điều kiện. */
export type ColumnFilters = Record<string, ColumnFilter | undefined>;

export const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: 'contains', label: 'Chứa' },
  { value: 'notContains', label: 'Không chứa' },
  { value: 'equals', label: 'Bằng' },
  { value: 'startsWith', label: 'Bắt đầu bằng' },
];

export const DEFAULT_OP: FilterOp = 'contains';

/** Hạ hoa thường + bỏ dấu tiếng Việt để so khớp "cong ty" ↔ "CÔNG TY". */
function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/** Có phải bộ lọc đang thực sự áp không (giá trị rỗng = chưa lọc). */
export function isActiveFilter(filter: ColumnFilter | undefined): boolean {
  return !!filter && filter.value.trim() !== '';
}

/**
 * Một ô có khớp điều kiện lọc không. Bộ lọc rỗng → khớp mọi dòng.
 * Ô nguồn rỗng chỉ khớp "Không chứa" (giống Excel: ô trống không chứa gì cả).
 */
export function matchText(raw: string | undefined | null, filter: ColumnFilter): boolean {
  if (!isActiveFilter(filter)) return true;

  const needle = fold(filter.value);
  const hay = fold(String(raw ?? ''));

  switch (filter.op) {
    case 'contains':
      return hay.includes(needle);
    case 'notContains':
      return !hay.includes(needle);
    case 'equals':
      return hay === needle;
    case 'startsWith':
      return hay.startsWith(needle);
    default:
      return true;
  }
}

/** Dòng có khớp TẤT CẢ bộ lọc đang bật không. `getValue` lấy ô theo key cột. */
export function matchAllFilters<T>(
  row: T,
  filters: ColumnFilters,
  getValue: (row: T, key: string) => string | undefined,
): boolean {
  for (const [key, filter] of Object.entries(filters)) {
    if (!filter || !isActiveFilter(filter)) continue;
    if (!matchText(getValue(row, key), filter)) return false;
  }
  return true;
}

/** Có bộ lọc nào đang bật không. */
export function hasActiveFilters(filters: ColumnFilters): boolean {
  return Object.values(filters).some(isActiveFilter);
}
