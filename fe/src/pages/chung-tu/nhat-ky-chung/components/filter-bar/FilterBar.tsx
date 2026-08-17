import { Badge, Button, Input, Tooltip } from "antd";
import { ClearOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import {
  NKC_FILTER_LABELS,
  NKC_FILTER_STATE_KEYS,
} from "../../handler/lib/nkcFilters";
import { useNkcFilterValues } from "../../hooks/useNkcFilterOptions";
import { PeriodRangeFilter } from "./PeriodRangeFilter";
import { useToolbarSlotRef } from "../toolbar-slot/ToolbarSlot";
import "./FilterBar.state";

/**
 * Hàng lọc trên cùng của "Dữ liệu tổng hợp": tìm kiếm, kỳ thời gian, xóa lọc và
 * nút "Thêm mới".
 *
 * Các tiêu chí lọc (tài khoản, đối tượng, dự án...) nằm ngay trên header cột của bảng
 * — xem `useNkcColumnFilters` — nên hàng này cố tình để trống, nhường diện tích cho bảng.
 */
export function FilterBar() {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const { canCreate } = usePagePermission("/chung-tu/nhat-ky-chung");
  const setToolbarSlot = useToolbarSlotRef();

  const [searchText, setSearchText] = useNhatKyChungState("searchText", "");
  const filterValues = useNkcFilterValues();

  // Tiêu chí đang bật — dropdown đã chuyển vào header cột nên phải có chỗ cho người
  // dùng biết mình vẫn đang lọc (kể cả tiêu chí đặt từ drill-down của trang khác).
  const activeFilterLabels = NKC_FILTER_STATE_KEYS.filter(
    (key) => !!filterValues[key],
  ).map((key) => NKC_FILTER_LABELS[key]);

  return (
    <div className="nkc-filter-bar">
      <div className="nkc-filter-bar__filters">
        <Input
          size="small"
          allowClear
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined className="text-muted-foreground" />}
          style={{ width: 180 }}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            // Bấm nút xóa (allowClear) → bỏ lọc ngay, không bắt Enter thêm lần nữa.
            if (!e.target.value) handler.executeEvent("search", { text: "" });
          }}
          onPressEnter={() =>
            handler.executeEvent("search", { text: searchText || "" })
          }
        />

        <span className="xl-cmd-sep" />

        <PeriodRangeFilter />

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
        {/* Nút lệnh của bảng bút toán (Import / Xuất / In / Làm mới / Chọn cột…) được
            EntryListTab bắn vào đây để đứng cùng "Thêm mới". */}
        <div className="nkc-filter-bar__slot" ref={setToolbarSlot} />
        {canCreate && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => navigate("/chung-tu/nhat-ky-chung/tao-moi")}
          >
            Thêm mới
          </Button>
        )}
      </div>
    </div>
  );
}
