import { useCallback } from "react";
import { FilterFilled, SearchOutlined } from "@ant-design/icons";
import type { ColumnType } from "antd/es/table";
import ColumnFilterDropdown from "@/components/table/ColumnFilterDropdown";
import { useKeHoachHandler } from "../KeHoachHandlerContext";
import {
  KE_HOACH_COLUMN_FILTER_KEYS,
  KE_HOACH_FILTER_LABELS,
} from "../lib/keHoachFilters";
import { useKeHoachFilterOptions, useKeHoachFilterValues } from "./useKeHoachFilterOptions";

/**
 * Gắn popover lọc vào header cột của lưới kế hoạch — cùng cách làm với bảng bút toán:
 * lưới phân trang phía server nên popover chỉ ghi vào state rồi gọi lại API.
 */
export function useKeHoachColumnFilters() {
  const handler = useKeHoachHandler();
  const optionsByKey = useKeHoachFilterOptions();
  const values = useKeHoachFilterValues();

  const withColumnFilter = useCallback(
    <T,>(col: ColumnType<T>): ColumnType<T> => {
      const stateKey = KE_HOACH_COLUMN_FILTER_KEYS[col.key as string];
      if (!stateKey) return col;

      const value = values[stateKey];
      const active = !!value;

      return {
        ...col,
        filtered: active,
        // Kính lúp = "bấm để tìm/lọc"; đang lọc thì đổi thành phễu, đúng quy ước Excel.
        filterIcon: active ? (
          <FilterFilled style={{ color: "#217346" }} />
        ) : (
          <SearchOutlined />
        ),
        filterDropdown: ({ close }: { close: () => void }) => (
          <ColumnFilterDropdown
            title={KE_HOACH_FILTER_LABELS[stateKey]}
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
