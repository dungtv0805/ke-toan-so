import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, DatePicker, Input, Select, Button, Space, Popconfirm } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { ChiTieu } from "@/services/keHoachService";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";
import { CHI_TIEU_OPTIONS, KE_HOACH_VIEWS } from "./keHoachViews";
import { ImportKeHoachModal } from "../import/ImportKeHoachModal";

const { RangePicker } = DatePicker;

/** Hàng lọc + các nút lệnh của màn hình Kế hoạch / Dự báo. */
export const FilterBar: React.FC = () => {
  const handler = useKeHoachHandler();
  const [dateRange] = useKeHoachState("dateRange");
  const [searchText] = useKeHoachState("searchText", "");
  const [phienBan] = useKeHoachState("phienBan");
  const [phienBanList] = useKeHoachState("phienBanList", []);
  const [view] = useKeHoachState("view", "list");
  const [chiTieu] = useKeHoachState("chiTieu", "tong");
  const [selectedRowKeys] = useKeHoachState("selectedRowKeys", []);
  const [moImport, setMoImport] = useState(false);
  const navigate = useNavigate();
  const [loaiKeHoach] = useKeHoachState("loaiKeHoach", "KE_HOACH");
  const duongDanForm =
    loaiKeHoach === "DU_BAO"
      ? "/trung-tam-du-lieu/du-bao/tao-moi"
      : "/trung-tam-du-lieu/ke-hoach/tao-moi";

  const dat = (key: string, value: unknown) => {
    handler.setState(key, value);
    handler.executeEvent("refresh", {});
  };

  return (
    <Card size="small" className="mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <RangePicker
          value={dateRange as [Dayjs, Dayjs] | undefined}
          format="DD/MM/YYYY"
          allowClear={false}
          onChange={(v) => dat("dateRange", v)}
        />

        <Select
          allowClear
          placeholder="Phiên bản"
          style={{ minWidth: 180 }}
          value={phienBan}
          options={(phienBanList ?? []).map((p: string) => ({ value: p, label: p }))}
          onChange={(v) => dat("phienBan", v)}
        />

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm diễn giải, nghiệp vụ, đối tượng"
          style={{ width: 260 }}
          defaultValue={searchText as string}
          onPressEnter={(e) => dat("searchText", (e.target as HTMLInputElement).value)}
          onChange={(e) => {
            if (!e.target.value) dat("searchText", "");
          }}
        />

        <Select
          style={{ minWidth: 230 }}
          value={view}
          options={KE_HOACH_VIEWS}
          onChange={(v) => handler.executeEvent("doiView", { view: v })}
        />

        {view !== "list" && (
          <Select
            style={{ minWidth: 190 }}
            value={chiTieu}
            options={CHI_TIEU_OPTIONS}
            onChange={(v) => handler.executeEvent("doiChiTieu", { chiTieu: v as ChiTieu })}
          />
        )}

        <Space className="ml-auto">
          {view === "list" && (
            <>
              {/* Nhập liệu đi qua trang form nhiều dòng, giống Dữ liệu tổng hợp.
                  Sửa nhanh một dòng thì vẫn bấm sửa ngay trên lưới. */}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(duongDanForm)}
              >
                Thêm mới
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={() => setMoImport(true)}>
                Import Excel
              </Button>
              {!!(selectedRowKeys as string[])?.length && (
                <Popconfirm
                  title={`Xóa ${(selectedRowKeys as string[]).length} dòng đã chọn?`}
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => handler.executeEvent("xoaNhieuDong", {})}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Xóa đã chọn
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => handler.executeEvent("refresh", {})}
          >
            Tải lại
          </Button>
        </Space>
      </div>

      <ImportKeHoachModal open={moImport} onClose={() => setMoImport(false)} />
    </Card>
  );
};
