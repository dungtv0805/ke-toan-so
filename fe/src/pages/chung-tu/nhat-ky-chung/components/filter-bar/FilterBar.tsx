import { useMemo } from "react";
import { Button, DatePicker, Input, Select, Tooltip } from "antd";
import { ClearOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import {
  KIEM_SOAT_OPTIONS,
  NKC_FILTER_BAR_KEYS,
  NKC_FILTER_LABELS,
  type NkcFilterStateKey,
} from "../../handler/lib/nkcFilters";
import { NKC_VIEWS } from "../data-tabs/nkcViews";
import "./FilterBar.state";

const { RangePicker } = DatePicker;

type Option = { value: string; label: string };

const byMa = (items: { ma?: string; ten?: string }[] = []): Option[] =>
  items
    .filter((x): x is { ma: string; ten?: string } => !!x?.ma)
    .map((x) => ({ value: x.ma, label: x.ten ? `${x.ma} - ${x.ten}` : x.ma }));

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
 * Hàng lọc trên cùng của "Dữ liệu tổng hợp": toàn bộ tiêu chí lọc ở dạng thả xuống,
 * dropdown chọn báo cáo (thay thanh tab cũ) và nút "Thêm mới" ở góc phải.
 */
export function FilterBar() {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const { canCreate } = usePagePermission("/chung-tu/nhat-ky-chung");

  const [dateRange] = useNhatKyChungState("dateRange", null);
  const [searchText, setSearchText] = useNhatKyChungState("searchText", "");
  const [activeTab, setActiveTab] = useNhatKyChungState("activeTab", "list");

  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [khoanMucList] = useNhatKyChungState("khoanMucList", []);
  const [doiTuongList] = useNhatKyChungState("doiTuongList", []);
  const [duAnList] = useNhatKyChungState("duAnList", []);
  const [boPhanList] = useNhatKyChungState("boPhanList", []);
  const [sanPhamList] = useNhatKyChungState("sanPhamList", []);
  const [hopDongList] = useNhatKyChungState("hopDongList", []);
  const [nhomKhuyenMaiList] = useNhatKyChungState("nhomKhuyenMaiList", []);
  const [loaiGiaoDichList] = useNhatKyChungState("loaiGiaoDichList", []);
  const [quyChaunList] = useNhatKyChungState("quyChaunList", []);
  const [nguoiGiaoDichList] = useNhatKyChungState("nguoiGiaoDichList", []);

  const optionsByKey = useMemo((): Record<NkcFilterStateKey, Option[]> => {
    // Nhân viên / Đội không có danh mục riêng — lấy từ đối tượng loại NHAN_VIEN và
    // bộ phận có tên chứa "đội" (giống cách form bút toán dựng options).
    const nhanVien = (doiTuongList ?? []).filter((d) =>
      (d.loai ?? []).includes("NHAN_VIEN"),
    );
    const doi = (boPhanList ?? []).filter((bp) =>
      (bp.ten ?? "").toLowerCase().includes("đội"),
    );
    const nghiepVu = Array.from(
      new Set((quyChaunList ?? []).map((qc) => qc.nghiepVu).filter(Boolean)),
    ).map((nv) => ({ value: nv, label: nv }));

    return {
      filterKiemSoat: KIEM_SOAT_OPTIONS,
      filterLoaiChungTu: byMa(loaiGiaoDichList),
      filterNghiepVu: nghiepVu,
      filterTaiKhoan: byMa(taiKhoanList),
      filterDoiTuong: byMa(doiTuongList),
      filterKhoanMuc: byMa(khoanMucList),
      filterNhanVien: byMa(nhanVien),
      filterDuAn: byMa(duAnList),
      filterSanPham: byMa(sanPhamList),
      filterHopDong: (hopDongList ?? [])
        .filter((hd) => !!hd.soHopDong)
        .map((hd) => ({
          value: hd.soHopDong,
          label: hd.tenCongTrinh
            ? `${hd.soHopDong} - ${hd.tenCongTrinh}`
            : hd.soHopDong,
        })),
      filterNguoiGiaoDich: (nguoiGiaoDichList ?? []).map((v) => ({
        value: v,
        label: v,
      })),
      filterDoi: byMa(doi),
      filterBoPhan: byMa(boPhanList),
      filterNhomKhuyenMai: byMa(nhomKhuyenMaiList),
      filterAccount: byMa(taiKhoanList),
      filterTaiKhoanCo: byMa(taiKhoanList),
    };
  }, [
    boPhanList,
    doiTuongList,
    duAnList,
    hopDongList,
    khoanMucList,
    loaiGiaoDichList,
    nguoiGiaoDichList,
    nhomKhuyenMaiList,
    quyChaunList,
    sanPhamList,
    taiKhoanList,
  ]);

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
        {NKC_FILTER_BAR_KEYS.map((key) => (
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
        <Tooltip title="Xóa lọc (về mặc định năm nay)">
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={() => handler.executeEvent("resetFilters", {})}
          />
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
