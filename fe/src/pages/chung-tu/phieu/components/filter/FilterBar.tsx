import { Row, Col, Space, Input, Select, DatePicker, Button, Tooltip } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";

const { RangePicker } = DatePicker;

export function FilterBar() {
  const handler = usePhieuHandler();

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

  return (
    <div className="mb-4 space-y-3">
      {/* Hàng tìm kiếm + bộ lọc */}
      <Row gutter={[12, 12]} align="middle">
        <Col flex="auto">
          <Space wrap>
            <Input
              placeholder="Tìm kiếm số phiếu, nội dung..."
              prefix={<SearchOutlined className="text-muted-foreground" />}
              value={searchText ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setFilter("searchText", val);
                if (val === "") apply();
              }}
              onPressEnter={apply}
              style={{ width: 280 }}
              allowClear
            />
            <RangePicker
              format="DD/MM/YYYY"
              value={(dateRange as [Dayjs, Dayjs] | null) ?? null}
              onChange={(v) => {
                setFilter("dateRange", v && v[0] && v[1] ? v : null);
                apply();
              }}
            />
            <Tooltip title="Đặt lại bộ lọc">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => handler.executeEvent("resetFilters", {})}
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]} align="middle" justify="space-between">
        <Col flex="auto">
          <Space wrap>
            <Select
              placeholder="Đối tượng"
              style={{ width: 170 }}
              allowClear
              value={filterDoiTuong}
              onChange={(v) => handleSelect("filterDoiTuong", v)}
              options={doiTuongList.map((dt) => ({ value: dt.ma, label: dt.ten }))}
            />
            <Select
              placeholder="Dự án"
              style={{ width: 170 }}
              allowClear
              value={filterDuAn}
              onChange={(v) => handleSelect("filterDuAn", v)}
              options={duAnList.map((da) => ({ value: da.ma, label: da.ten }))}
            />
            <Select
              placeholder="Bộ phận"
              style={{ width: 170 }}
              allowClear
              value={filterBoPhan}
              onChange={(v) => handleSelect("filterBoPhan", v)}
              options={boPhanList.map((bp) => ({ value: bp.ma, label: bp.ten }))}
            />
            <Select
              placeholder="TK Nợ"
              style={{ width: 160 }}
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterTaiKhoanNo}
              onChange={(v) => handleSelect("filterTaiKhoanNo", v)}
              options={taiKhoanList.map((tk) => ({
                value: tk.ma,
                label: `${tk.ma} - ${tk.ten}`,
              }))}
            />
            <Select
              placeholder="TK Có"
              style={{ width: 160 }}
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterTaiKhoanCo}
              onChange={(v) => handleSelect("filterTaiKhoanCo", v)}
              options={taiKhoanList.map((tk) => ({
                value: tk.ma,
                label: `${tk.ma} - ${tk.ten}`,
              }))}
            />
          </Space>
        </Col>
        <Col>
          <Space wrap>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => setTemplateModalOpen(true)}
            >
              Mẫu in
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              Import Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPhieu(null);
                setFormModalOpen(true);
              }}
            >
              Thêm phiếu
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
