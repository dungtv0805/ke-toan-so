import { Badge, Button, DatePicker, Input, Select, Tooltip } from "antd";
import { ClearOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import {
  NKC_FILTER_BAR_KEYS,
  NKC_FILTER_LABELS,
  NKC_FILTER_STATE_KEYS,
  type NkcFilterStateKey,
} from "../../handler/lib/nkcFilters";
import {
  useNkcFilterOptions,
  useNkcFilterValues,
  type FilterOption as Option,
} from "../../hooks/useNkcFilterOptions";
import { NKC_VIEWS } from "../data-tabs/nkcViews";
import "./FilterBar.state";

const { RangePicker } = DatePicker;

type Range = [dayjs.Dayjs, dayjs.Dayjs];

/**
 * Khoảng thời gian dựng sẵn — "Thời gian" cũng là một mục chọn trên hàng lọc.
 * Quý tính tay vì dự án không nạp plugin `quarterOfYear` của dayjs.
 */
function rangePresets(): { label: string; value: Range }[] {
  const now = dayjs();
  const quarterStart = now.month(Math.floor(now.month() / 3) * 3).startOf("month");
  return [
    { label: "Năm nay", value: [now.startOf("year"), now.endOf("year")] },
    {
      label: "Năm trước",
      value: [
        now.subtract(1, "year").startOf("year"),
        now.subtract(1, "year").endOf("year"),
      ],
    },
    {
      label: "Quý này",
      value: [quarterStart, quarterStart.add(2, "month").endOf("month")],
    },
    { label: "Tháng này", value: [now.startOf("month"), now.endOf("month")] },
    {
      label: "Tháng trước",
      value: [
        now.subtract(1, "month").startOf("month"),
        now.subtract(1, "month").endOf("month"),
      ],
    },
  ];
}

/**
 * Hàng lọc trên cùng của "Dữ liệu tổng hợp": tìm kiếm, khoảng thời gian, dropdown chọn
 * báo cáo (thay thanh tab cũ) và nút "Thêm mới" ở góc phải.
 *
 * Ở view "Bút toán" các tiêu chí lọc nằm ngay trên header cột (xem `useNkcColumnFilters`)
 * nên hàng này KHÔNG bày 14 dropdown nữa — nhường diện tích cho bảng. Các view báo cáo
 * không có cột tương ứng nên vẫn giữ đủ dropdown.
 */
export function FilterBar() {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const { canCreate } = usePagePermission("/chung-tu/nhat-ky-chung");

  const [dateRange] = useNhatKyChungState("dateRange", null);
  const [searchText, setSearchText] = useNhatKyChungState("searchText", "");
  const [activeTab, setActiveTab] = useNhatKyChungState("activeTab", "list");

  const optionsByKey = useNkcFilterOptions();
  const filterValues = useNkcFilterValues();

  const isEntryList = activeTab === "list";
  // Tiêu chí đang bật — ở view Bút toán dropdown bị ẩn, phải có chỗ cho người dùng
  // biết mình vẫn đang lọc (kể cả tiêu chí đặt từ view khác hoặc từ drill-down).
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
        {!isEntryList &&
          NKC_FILTER_BAR_KEYS.map((key) => (
            <FilterSelect key={key} filterKey={key} options={optionsByKey[key]} />
          ))}
        <RangePicker
          size="small"
          format="DD/MM/YYYY"
          value={dateRange}
          presets={rangePresets()}
          placeholder={["Từ ngày", "Đến ngày"]}
          style={{ width: 220 }}
          onChange={(dates) =>
            handler.executeEvent("filterByDate", {
              dates: dates as [dayjs.Dayjs, dayjs.Dayjs] | null,
            })
          }
        />
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
        <Select
          size="small"
          style={{ width: 220 }}
          value={activeTab}
          onChange={setActiveTab}
          options={NKC_VIEWS.map((v) => ({
            value: v.key,
            label: (
              <span>
                {v.icon} {v.label}
              </span>
            ),
          }))}
        />
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

function FilterSelect({
  filterKey,
  options,
}: {
  filterKey: NkcFilterStateKey;
  options: Option[];
}) {
  const handler = useNhatKyChungHandler();
  const [value] = useNhatKyChungState(filterKey, undefined);

  return (
    <Select
      size="small"
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={NKC_FILTER_LABELS[filterKey]}
      style={{ width: 160 }}
      value={value}
      options={options}
      onChange={(next) =>
        handler.executeEvent("setFilter", { key: filterKey, value: next })
      }
    />
  );
}
