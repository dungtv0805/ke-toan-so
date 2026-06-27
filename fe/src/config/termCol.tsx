import type { ColumnType } from 'antd/es/table';
import { EditableTerm } from '@/components/glossary/EditableTerm';

/**
 * Tạo cột antd với tiêu đề là nhãn đổi-tên-được (EditableTerm).
 * Dùng để nhân nhanh cột có title cấu hình theo lĩnh vực.
 */
export function termCol<T>(
  args: { tk: string; surface?: string } & ColumnType<T>,
): ColumnType<T> {
  const { tk, surface, ...col } = args;
  return { ...col, title: <EditableTerm tk={tk} surface={surface} /> };
}
