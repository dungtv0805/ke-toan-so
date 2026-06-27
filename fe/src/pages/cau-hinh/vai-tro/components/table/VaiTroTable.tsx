import { Table, Tag, Button, Space, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEffect } from "react";
import { useVaiTroHandler, useVaiTroState } from "../../VaiTroHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { VaiTroItem } from "./VaiTroTable.state";
import "./VaiTroTable.state";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";

interface VaiTroTableProps {
  onSettingsButton?: (node: React.ReactNode) => void;
}

export function VaiTroTable({ onSettingsButton }: VaiTroTableProps) {
  const handler = useVaiTroHandler();
  const [vaiTroList] = useVaiTroState("vaiTroList", [] as VaiTroItem[]);
  const [loading] = useVaiTroState("loading", false);
  const { canEdit, canDelete } = usePagePermission("/cau-hinh/vai-tro");

  const handleEdit = (record: VaiTroItem) => {
    handler.executeEvent("openModal", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("deleteVaiTro", { id });
  };

  const columns: ColumnsType<VaiTroItem> = [
    {
      title: "Tên vai trò",
      dataIndex: "ten",
      key: "ten",
      width: 200,
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
    },
    {
      title: "Số người dùng",
      dataIndex: "soNguoiDung",
      key: "soNguoiDung",
      width: 140,
      align: "center",
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 140,
      align: "center",
      render: (trangThai: VaiTroItem["trangThai"]) => (
        <Tag color={trangThai === "HOAT_DONG" ? "green" : "red"}>
          {trangThai === "HOAT_DONG" ? "Hoạt động" : "Khoá"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 140,
      align: "center",
      render: (_: unknown, record: VaiTroItem) => (
        <Space>
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Bạn có chắc muốn xoá vai trò này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xoá"
              cancelText="Huỷ"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig<VaiTroItem>('cauHinh.vaiTro', columns);

  useEffect(() => {
    onSettingsButton?.(settingsButton);
  }, [settingsButton, onSettingsButton]);

  return (
    <Table<VaiTroItem>
      columns={cfgColumns}
      dataSource={vaiTroList}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      bordered
    />
  );
}
