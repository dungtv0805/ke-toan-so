import { useState, type ReactNode } from "react";
import { Select, DatePicker, Button, Badge, Tooltip } from "antd";
import type { ButtonProps } from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { FilterBar as SharedFilterBar } from "@/components/common/FilterBar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { useManHinh } from "@/hooks/useManHinh";
import { nutLenh } from "@/components/common/nutLenh";

const { RangePicker } = DatePicker;

export function FilterBar({ settingsButton }: { settingsButton?: ReactNode }) {
  const handler = usePhieuHandler();
  const isAdmin = useIsAdmin();
  const dienThoai = useManHinh() === "mobile";
  // Điện thoại: 5 ô lọc danh mục xếp 2 ô/dòng là thêm 3 dòng đẩy bảng xuống quá
  // nửa màn → gập sau nút "Bộ lọc", chỉ để ô tìm + khoảng ngày luôn hiện.
  const [moLocPhu, setMoLocPhu] = useState(false);

  const [searchText] = usePhieuState("searchText", "");
  const [dateRange] = usePhieuState("dateRange", null);
  const [filterDoiTuong] = usePhieuState("filterDoiTuong", undefined);
  const [filterDuAn] = usePhieuState("filterDuAn", undefined);
  const [filterBoPhan] = usePhieuState("filterBoPhan", undefined);
  const [filterTaiKhoanNo] = usePhieuState("filterTaiKhoanNo", undefined);
  const [filterTaiKhoanCo] = usePhieuState("filterTaiKhoanCo", undefined);

  const [doiTuongList] = usePhieuState("doiTuongList", []);
  const [duAnList] = usePhieuState("duAnList", []);
  const [boPhanList] = usePhieuState("boPhanList", []);
  const [taiKhoanList] = usePhieuState("taiKhoanList", []);

  const [, setFormModalOpen] = usePhieuState("formModalOpen", false);
  const [, setEditingPhieu] = usePhieuState("editingPhieu", null);
  const [, setImportModalOpen] = usePhieuState("importModalOpen", false);
  const [, setTemplateModalOpen] = usePhieuState("templateModalOpen", false);

  const setFilter = (key: string, value: unknown) =>
    handler.executeEvent("setFilter", { key, value });
  const apply = () => handler.executeEvent("applyFilters", {});

  const handleSelect = (key: string, value: string | undefined) => {
    setFilter(key, value);
    apply();
  };

  const soLocPhuDangBat = [
    filterDoiTuong,
    filterDuAn,
    filterBoPhan,
    filterTaiKhoanNo,
    filterTaiKhoanCo,
  ].filter(Boolean).length;
  const hienLocPhu = !dienThoai || moLocPhu;

  const tkOptions = taiKhoanList.map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  return (
    <SharedFilterBar
      search={{
        value: searchText ?? "",
        onChange: (v) => setFilter("searchText", v),
        onSearch: apply,
        placeholder: "Tìm kiếm số phiếu, nội dung...",
      }}
      onReset={() => handler.executeEvent("resetFilters", {})}
      filters={
        <>
          <RangePicker
            format="DD/MM/YYYY"
            value={(dateRange as [Dayjs, Dayjs] | null) ?? null}
            onChange={(v) => {
              setFilter("dateRange", v && v[0] && v[1] ? v : null);
              apply();
            }}
          />
          {dienThoai && (
            // Số trên huy hiệu = số ô lọc đang bật mà đang bị gập, để không quên mình đang lọc.
            <Tooltip title="Bộ lọc khác">
              <Badge count={moLocPhu ? 0 : soLocPhuDangBat} size="small">
                <Button
                  icon={<FilterOutlined />}
                  type={moLocPhu ? "primary" : "default"}
                  aria-label="Bộ lọc khác"
                  aria-expanded={moLocPhu}
                  onClick={() => setMoLocPhu((v) => !v)}
                />
              </Badge>
            </Tooltip>
          )}
          {hienLocPhu && (
            <>
              <Select
                placeholder="Đối tượng"
                style={{ width: 170 }}
                allowClear
                value={filterDoiTuong}
                onChange={(v) => handleSelect("filterDoiTuong", v)}
                options={sapXepTheoNhan(doiTuongList.map((dt) => ({ value: dt.ma, label: dt.ten })))}
              />
              <Select
                placeholder="Dự án"
                style={{ width: 170 }}
                allowClear
                value={filterDuAn}
                onChange={(v) => handleSelect("filterDuAn", v)}
                options={sapXepTheoNhan(duAnList.map((da) => ({ value: da.ma, label: da.ten })))}
              />
              <Select
                placeholder="Bộ phận"
                style={{ width: 170 }}
                allowClear
                value={filterBoPhan}
                onChange={(v) => handleSelect("filterBoPhan", v)}
                options={sapXepTheoNhan(boPhanList.map((bp) => ({ value: bp.ma, label: bp.ten })))}
              />
              <Select
                placeholder="TK Nợ"
                style={{ width: 160 }}
                allowClear
                showSearch
                optionFilterProp="label"
                value={filterTaiKhoanNo}
                onChange={(v) => handleSelect("filterTaiKhoanNo", v)}
                options={tkOptions}
              />
              <Select
                placeholder="TK Có"
                style={{ width: 160 }}
                allowClear
                showSearch
                optionFilterProp="label"
                value={filterTaiKhoanCo}
                onChange={(v) => handleSelect("filterTaiKhoanCo", v)}
                options={tkOptions}
              />
            </>
          )}
        </>
      }
      actions={
        <>
          {settingsButton}
          {isAdmin &&
            nutLenh(dienThoai, "Mẫu in", {
              icon: <FileTextOutlined />,
              onClick: () => setTemplateModalOpen(true),
            })}
          {nutLenh(dienThoai, "Import Excel", {
            icon: <UploadOutlined />,
            onClick: () => setImportModalOpen(true),
          })}
          {nutLenh(dienThoai, "Thêm phiếu", {
            type: "primary",
            icon: <PlusOutlined />,
            onClick: () => {
              setEditingPhieu(null);
              setFormModalOpen(true);
            },
          })}
        </>
      }
    />
  );
}
