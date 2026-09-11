import React, { useCallback, useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import ColumnFilterDropdown from './ColumnFilterDropdown';
import {
  hasActiveFilters,
  isActiveFilter,
  matchAllFilters,
  type CellValue,
  type ColumnFilter,
  type ColumnFilters,
  type FilterKind,
} from './columnFilter';
import { readPinnedKeys, savePinnedKeys, togglePinned } from './columnPin';
import { useManHinh } from '@/hooks/useManHinh';

/**
 * Lọc + cố định cột ngay tại header (antd `filterDropdown`).
 *
 * CHỦ Ý không dùng `onFilter` của antd: nó lọc trên từng dòng đã dàn phẳng, nên bảng có dòng
 * nhóm/dòng tổng sẽ không tính lại được số tổng. Hook chỉ giữ state + vẽ popover; việc lọc dữ
 * liệu do trang tự làm trên dữ liệu gốc (dùng `matches`).
 *
 * Bộ lọc sống theo vòng đời trang (rời trang là mất). Cột ghim lưu localStorage theo
 * `pageKey` + công ty đang chọn.
 */
export interface FilterableOptions {
  /** 'number' → toán tử số; 'select' → chọn từ danh mục. Mặc định 'text'. */
  type?: FilterKind;
  /** Nhãn "Lọc …" khi tiêu đề cột trùng nhau (vd 4 cột "Nợ"/"Có"). Mặc định lấy `col.title`. */
  filterTitle?: string;
  /** Danh sách chọn, bắt buộc khi `type: 'select'`. */
  options?: { value: string; label: string }[];
}

export function useTableColumnFilters(pageKey: string) {
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [pinned, setPinned] = useState<string[]>(() => readPinnedKeys(pageKey));

  const setFilter = useCallback((key: string, filter: ColumnFilter | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (filter) next[key] = filter;
      else delete next[key];
      return next;
    });
  }, []);

  const togglePin = useCallback(
    (key: string) => {
      setPinned((prev) => {
        const next = togglePinned(prev, key);
        savePinnedKeys(pageKey, next);
        return next;
      });
    },
    [pageKey],
  );

  // Cột ghim người dùng tự chọn là thói quen trên màn máy tính (lưu theo trình
  // duyệt). Trên điện thoại vài cột ghim là hết chỗ — bỏ qua, chỉ còn cột ghim
  // do trang khai sẵn (xem ghimTheoManHinh). Lựa chọn đã lưu vẫn nguyên.
  const dienThoai = useManHinh() === 'mobile';
  const pinnedSet = useMemo(
    () => (dienThoai ? new Set<string>() : new Set(pinned)),
    [pinned, dienThoai],
  );

  /**
   * Gắn popover lọc + cố định vào một cột. `title` phải là chuỗi (dùng làm nhãn "Lọc ...").
   * Cột số truyền `{ type: 'number' }`; cột trùng tiêu đề truyền thêm `filterTitle`.
   */
  const filterable = useCallback(
    <T,>(
      col: ColumnType<T> & { key: string; title: string },
      opts?: FilterableOptions,
    ): ColumnType<T> => {
      const kind: FilterKind = opts?.type ?? 'text';
      const active = isActiveFilter(filters[col.key]);
      return {
        ...col,
        fixed: pinnedSet.has(col.key) ? 'left' : col.fixed,
        // Kính lúp thay cho mũi tên: người dùng nhận ra "bấm để tìm/lọc" ngay.
        filterIcon: (
          <SearchOutlined style={{ color: active ? '#1890ff' : undefined }} />
        ),
        filtered: active,
        filterDropdown: ({ close }: { close: () => void }) => (
          <ColumnFilterDropdown
            title={opts?.filterTitle ?? col.title}
            kind={kind}
            options={opts?.options}
            filter={filters[col.key]}
            pinned={pinnedSet.has(col.key)}
            onApply={(f) => setFilter(col.key, f)}
            // Điện thoại bỏ qua cột ghim của người dùng (xem pinnedSet) → ẩn luôn
            // nút ghim: bấm ở đây sẽ sửa lựa chọn đã lưu của màn máy tính mà trên
            // điện thoại không thấy tác dụng gì.
            onTogglePin={
              dienThoai
                ? undefined
                : () => {
                    togglePin(col.key);
                    close();
                  }
            }
            onClose={close}
          />
        ),
      };
    },
    [filters, pinnedSet, setFilter, togglePin, dienThoai],
  );

  /** Dòng có khớp toàn bộ bộ lọc đang bật không. `getValue(row, key)` lấy ô theo key cột. */
  const matches = useCallback(
    <T,>(row: T, getValue: (row: T, key: string) => CellValue) =>
      matchAllFilters(row, filters, getValue),
    [filters],
  );

  return {
    filters,
    filtering: hasActiveFilters(filters),
    hasPinned: pinnedSet.size > 0,
    filterable,
    matches,
  };
}
