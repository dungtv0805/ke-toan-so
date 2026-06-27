import { useMemo } from 'react';
import type { ColumnType } from 'antd/es/table';
import { useAuth } from '@/contexts/AuthContext';
import { TableTitleSettings } from '@/components/glossary/TableTitleSettings';
import { tableTermKey, extractColTitles, lookupOverride } from '@/config/tableTitleConfig';
import type { TitleTermSpec } from '@/config/titleConfig';

/**
 * Bọc cột bảng để đổi tiêu đề theo lĩnh vực/công ty (lưu per-page).
 * Trả về columns (đã thay title = override ?? title gốc) và nút ⚙️ mở Drawer.
 *
 * LƯU Ý: mỗi BẢNG dùng 1 `pageKey` DUY NHẤT. Đừng dùng lại 1 pageKey cho 2 bảng
 * khác nhau trên cùng trang — override lưu theo (pageKey, colKey) nên 2 bảng trùng
 * pageKey sẽ chia sẻ nhãn theo colKey trùng.
 */
export function useTableTitleConfig<T>(pageKey: string, columns: ColumnType<T>[]) {
  const { currentTenant, currentLinhVuc } = useAuth();
  const tenantG = currentTenant?.glossary;
  const nganhG = currentLinhVuc?.glossary;

  const colTitles = useMemo(() => extractColTitles(columns), [columns]);

  const terms: TitleTermSpec[] = useMemo(
    () => colTitles.map((c) => ({ tk: tableTermKey(pageKey, c.colKey) })),
    [colTitles, pageKey],
  );
  const defaults: Record<string, string> = useMemo(() => {
    const d: Record<string, string> = {};
    for (const c of colTitles) d[`${tableTermKey(pageKey, c.colKey)}|`] = c.def;
    return d;
  }, [colTitles, pageKey]);

  const mappedColumns = useMemo(() => {
    return columns.map((col) => {
      if (typeof col.title !== 'string' || col.title.trim() === '') return col;
      const key = (col as { key?: unknown; dataIndex?: unknown }).key ??
        (col as { dataIndex?: unknown }).dataIndex;
      if (key == null) return col;
      const ov = lookupOverride(tenantG, nganhG, tableTermKey(pageKey, String(key)));
      return ov ? { ...col, title: ov } : col;
    });
  }, [columns, tenantG, nganhG, pageKey]);

  const settingsButton =
    terms.length > 0 ? <TableTitleSettings terms={terms} defaults={defaults} /> : null;

  return { columns: mappedColumns, settingsButton };
}
