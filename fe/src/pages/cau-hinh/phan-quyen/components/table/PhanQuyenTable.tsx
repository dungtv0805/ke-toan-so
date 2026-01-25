import { useCallback, useEffect, useRef } from "react";
import { Badge, Card, Input, Table, Tabs } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  usePhanQuyenHandler,
  usePhanQuyenState,
} from "../../PhanQuyenHandlerContext";
import { vaiTroOptions } from "@/mock-data/nguoi-dung";
import { VaiTro } from "@/types";
import { createColumns } from "./columns";
import "./PhanQuyenTable.state";

export function PhanQuyenTable() {
  const handler = usePhanQuyenHandler();
  const [nguoiDungList] = usePhanQuyenState("nguoiDungList", []);
  const [loading] = usePhanQuyenState("loading", false);
  const [pagination] = usePhanQuyenState("pagination", {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchText, setSearchText] = usePhanQuyenState("searchText", "");
  const [filterVaiTro, setFilterVaiTro] = usePhanQuyenState(
    "filterVaiTro",
    "all"
  );
  const [stats] = usePhanQuyenState("stats", null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchText(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        handler.executeEvent("fetchData", {
          page: 1,
          limit: pagination?.limit || 10,
          search: value || undefined,
          vaiTro: filterVaiTro !== "all" ? (filterVaiTro as VaiTro) : undefined,
        });
      }, 300);
    },
    [handler, pagination?.limit, filterVaiTro, setSearchText]
  );

  const handleFilterChange = useCallback(
    (vaiTro: string) => {
      setFilterVaiTro(vaiTro as VaiTro | "all");
      handler.executeEvent("fetchData", {
        page: 1,
        limit: pagination?.limit || 10,
        search: searchText || undefined,
        vaiTro: vaiTro !== "all" ? (vaiTro as VaiTro) : undefined,
      });
    },
    [handler, pagination?.limit, searchText, setFilterVaiTro]
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      handler.executeEvent("fetchData", {
        page,
        limit: pageSize,
        search: searchText || undefined,
        vaiTro: filterVaiTro !== "all" ? (filterVaiTro as VaiTro) : undefined,
      });
    },
    [handler, searchText, filterVaiTro]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const columns = createColumns(handler);

  const getVaiTroColor = (color: string) => {
    const colorMap: Record<string, string> = {
      red: "#f5222d",
      blue: "#1890ff",
      orange: "#fa8c16",
      purple: "#722ed1",
      green: "#52c41a",
      cyan: "#13c2c2",
    };
    return colorMap[color] || color;
  };

  const tabItems = [
    {
      key: "all",
      label: (
        <span>
          Tất cả{" "}
          <Badge count={stats?.tongNguoiDung || 0} style={{ marginLeft: 8 }} />
        </span>
      ),
    },
    ...vaiTroOptions.map((vt) => ({
      key: vt.value,
      label: (
        <span>
          {vt.label}
          <Badge
            count={stats?.theoVaiTro[vt.value] || 0}
            style={{ marginLeft: 8, backgroundColor: getVaiTroColor(vt.color) }}
          />
        </span>
      ),
    })),
  ];

  return (
    <Card>
      <Tabs
        activeKey={filterVaiTro}
        onChange={handleFilterChange}
        items={tabItems}
        tabBarExtraContent={
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        }
      />

      <Table
        columns={columns}
        dataSource={nguoiDungList}
        rowKey="id"
        loading={loading}
        scroll={{ y: "calc(100vh - 285px)" }}
        pagination={{
          current: pagination?.page || 1,
          pageSize: pagination?.limit || 10,
          total: pagination?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} người dùng`,
          onChange: handlePageChange,
        }}
      />
    </Card>
  );
}
