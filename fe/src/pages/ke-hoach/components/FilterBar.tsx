import React from "react";
import { Badge, Button, Input, Select, Tooltip } from "antd";
import { ClearOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePagePermission } from "@/hooks/usePagePermission";
import type { ChiTieu, LoaiKeHoach } from "@/services/keHoachService";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";
import {
  KE_HOACH_FILTER_LABELS,
  KE_HOACH_FILTER_STATE_KEYS,
} from "../lib/keHoachFilters";
import { useKeHoachFilterValues } from "../hooks/useKeHoachFilterOptions";
import { PeriodRangeFilter } from "./PeriodRangeFilter";
import { useToolbarSlotRef } from "./toolbar-slot/ToolbarSlot";
import { CHI_TIEU_OPTIONS, KE_HOACH_VIEWS } from "./keHoachViews";

/**
 * Hàng lọc trên cùng của Kế hoạch / Dự báo — dựng đúng như "Dữ liệu tổng hợp": tìm
 * kiếm, kỳ thời gian, xóa lọc, nút "Thêm mới"; các tiêu chí lọc theo chiều nằm ở
 * header cột của bảng (xem `useKeHoachColumnFilters`).
 */
export const FilterBar: React.FC = () => {
  const navigate = useNavigate();
  const handler = useKeHoachHandler();
  const setToolbarSlot = useToolbarSlotRef();

  const [loaiKeHoach] = useKeHoachState("loaiKeHoach", "KE_HOACH");
  const [searchText, setSearchText] = useKeHoachState("searchText", "");
  const [phienBan] = useKeHoachState("phienBan");
  const [phienBanList] = useKeHoachState("phienBanList", []);
  const [view] = useKeHoachState("view", "list");
  const [chiTieu] = useKeHoachState("chiTieu", "tong");
  const filterValues = useKeHoachFilterValues();

  const duongDan =
    (loaiKeHoach as LoaiKeHoach) === "DU_BAO"
      ? "/trung-tam-du-lieu/du-bao"
      : "/trung-tam-du-lieu/ke-hoach";
  const { canCreate } = usePagePermission(duongDan);

  // Tiêu chí đang bật — dropdown nằm ở header cột nên phải có chỗ báo là vẫn đang lọc.
  const activeFilterLabels = KE_HOACH_FILTER_STATE_KEYS.filter(
    (key) => !!filterValues[key],
  ).map((key) => KE_HOACH_FILTER_LABELS[key]);

  return (
    <div className="nkc-filter-bar">
      <div className="nkc-filter-bar__filters">
        <Input
          size="small"
          allowClear
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined className="text-muted-foreground" />}
          style={{ width: 180 }}
          value={searchText as string}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!e.target.value) handler.executeEvent("search", { text: "" });
          }}
          onPressEnter={() =>
            handler.executeEvent("search", { text: (searchText as string) || "" })
          }
        />

        <span className="xl-cmd-sep" />

        <PeriodRangeFilter />

        <span className="xl-cmd-sep" />

        <Select
          size="small"
          allowClear
          placeholder="Phiên bản"
          style={{ width: 160 }}
          value={phienBan as string | undefined}
          options={((phienBanList ?? []) as string[]).map((p) => ({ value: p, label: p }))}
          onChange={(v) => handler.executeEvent("setPhienBan", { phienBan: v })}
        />

        <Select
          size="small"
          style={{ width: 210 }}
          value={view}
          options={KE_HOACH_VIEWS}
          onChange={(v) => handler.executeEvent("doiView", { view: v })}
        />

        {view !== "list" && (
          <Select
            size="small"
            style={{ width: 175 }}
            value={chiTieu}
            options={CHI_TIEU_OPTIONS}
            onChange={(v) => handler.executeEvent("doiChiTieu", { chiTieu: v as ChiTieu })}
          />
        )}

        <span className="xl-cmd-sep" />

        <Tooltip
          title={
            activeFilterLabels.length
              ? `Đang lọc: ${activeFilterLabels.join(", ")} — bấm để xóa lọc (về mặc định năm nay)`
              : "Xóa lọc (về mặc định năm nay)"
          }
        >
          <Badge count={activeFilterLabels.length} size="small" offset={[-2, 2]}>
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={() => handler.executeEvent("resetFilters", {})}
            />
          </Badge>
        </Tooltip>
      </div>

      <div className="nkc-filter-bar__actions">
        {/* Nút lệnh của bảng (Import / Xuất / Làm mới / Chọn cột) bắn vào đây. */}
        <div className="nkc-filter-bar__slot" ref={setToolbarSlot} />
        {canCreate && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => navigate(`${duongDan}/tao-moi`)}
          >
            Thêm mới
          </Button>
        )}
      </div>
    </div>
  );
};
