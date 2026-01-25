import { Space, Button, Tooltip, Popconfirm } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { NhatKyChung } from "@/types";
import { useNhatKyChungHandler } from "../../NhatKyChungHandlerContext";

interface EntryActionsProps {
  entry: NhatKyChung;
}

export function EntryActions({ entry }: EntryActionsProps) {
  const handler = useNhatKyChungHandler();

  // Check if entry is approved (cannot edit/delete)
  const isApproved = (entry as any).trangThai === "DA_DUYET";

  const handleView = () => {
    handler.executeEvent("openViewModal", { entry });
  };

  const handleEdit = () => {
    handler.executeEvent("openEditModal", { entry });
  };

  const handleDelete = () => {
    handler.executeEvent("deleteEntry", { id: entry.id });
  };

  return (
    <Space size="small">
      <Tooltip title="Xem">
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={handleView}
        />
      </Tooltip>

      <Tooltip title={isApproved ? "Không thể sửa bút toán đã duyệt" : "Sửa"}>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={handleEdit}
          disabled={isApproved}
          className={isApproved ? "" : "!text-primary"}
        />
      </Tooltip>

      <Popconfirm
        title="Xác nhận xóa bút toán này?"
        onConfirm={handleDelete}
        okText="Xóa"
        cancelText="Hủy"
        disabled={isApproved}
      >
        <Tooltip title={isApproved ? "Không thể xóa bút toán đã duyệt" : "Xóa"}>
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            disabled={isApproved}
            className={isApproved ? "" : "!text-destructive"}
          />
        </Tooltip>
      </Popconfirm>
    </Space>
  );
}
