import { useCallback } from "react";
import { FilterFilled, SearchOutlined } from "@ant-design/icons";
import type { ColumnType } from "antd/es/table";
import ColumnFilterDropdown from "@/components/table/ColumnFilterDropdown";
import { useNhatKyChungHandler } from "../NhatKyChungHandlerContext";
import {
  NKC_COLUMN_FILTER_KEYS,
  NKC_FILTER_LABELS,
} from "../handler/lib/nkcFilters";
import { useNkcFilterOptions, useNkcFilterValues } from "./useNkcFilterOptions";

/**
 * Gắn popover lọc vào header cột của bảng bút toán.
 *
 * KHÁC với `useTableColumnFilters` dùng chung: bảng bút toán phân trang phía server nên
 * không thể lọc trên dữ liệu đã tải. Popover ở đây chỉ ghi vào state handler
 * (`setFilter` → gọi lại API), đúng như hàng lọc trên cùng vẫn làm.
 */
export function useNkcColumnFilters() {
  const handler = useNhatKyChungHandler();
  const optionsByKey = useNkcFilterOptions();
  const values = useNkcFilterValues();

  /** Cột nào có trong `NKC_COLUMN_FILTER_KEYS` thì được gắn nút lọc, còn lại giữ nguyên. */
  const withColumnFilter = useCallback(
    <T,>(col: ColumnType<T>): ColumnType<T> => {
      const stateKey = NKC_COLUMN_FILTER_KEYS[col.key as string];
      if (!stateKey) return col;

      const value = values[stateKey];
      const active = !!value;
      const title = NKC_FILTER_LABELS[stateKey];

      return {
        ...col,
        filtered: active,
        // Kính lúp = "bấm để tìm/lọc"; đang lọc thì đổi thành phễu, đúng quy ước Excel.
        // Chỉ đổi icon, KHÔNG nhuộm nền cột — badge trên nút "Xóa lọc" đã đếm sẵn rồi.
        filterIcon: active ? (
          <FilterFilled style={{ color: "#217346" }} />
        ) : (
          <SearchOutlined />
        ),
        filterDropdown: ({ close }: { close: () => void }) => (
          <ColumnFilterDropdown
            title={title}
            kind="select"
            options={optionsByKey[stateKey]}
            filter={value ? { kind: "select", value } : undefined}
            onApply={(f) =>
              handler.executeEvent("setFilter", {
                key: stateKey,
                value: f?.value || undefined,
              })
            }
            onClose={close}
          />
        ),
      };
    },
    [handler, optionsByKey, values],
  );

  return { withColumnFilter };
}
