import { useState } from "react";
import { Space, Button, Tooltip, Dropdown, Modal, message } from "antd";
import type { MenuProps } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PrinterOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useAuth } from "@/contexts/AuthContext";
import { NhatKyChung } from "@/types";
import {
  useNhatKyChungHandler,
  useNhatKyChungState,
} from "../../NhatKyChungHandlerContext";
import { printNkcEntry, loaiPhieuCuaButToan } from "../../print/nkcPhieuPrint";

interface EntryActionsProps {
  entry: NhatKyChung;
}

/**
 * Cột "Chức năng": một nút chính "Xem" + mũi tên mở các lệnh còn lại
 * (Sửa / Nhân bản / In / Xóa). Gom vào 1 ô thay vì 4 icon rời cho đỡ chật —
 * bảng này đã rất nhiều cột.
 */
export function EntryActions({ entry }: EntryActionsProps) {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const { currentTenant } = useAuth();
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/chung-tu/nhat-ky-chung"
  );

  const [printing, setPrinting] = useState(false);

  // Row edit state (for inline edit via double-click)
  const [editingRowId] = useNhatKyChungState("editingRowId", null);
  const [savingRow] = useNhatKyChungState("savingRow", false);

  const isThisRowEditing = editingRowId === entry.id;
  const isOtherRowEditing = !!editingRowId && editingRowId !== entry.id;

  // Bút toán đã duyệt thì không cho sửa/xóa
  const isApproved =
    (entry as unknown as { trangThai?: string }).trangThai === "DA_DUYET";

  const handleView = () => handler.executeEvent("openViewModal", { entry });

  const handleEdit = () =>
    navigate(`/chung-tu/nhat-ky-chung/${encodeURIComponent(entry.soPhieu)}/sua`);

  // Nhân bản: mở form tạo mới đã điền sẵn dữ liệu của chứng từ này
  const handleClone = () =>
    navigate(
      `/chung-tu/nhat-ky-chung/${encodeURIComponent(entry.soPhieu)}/nhan-ban`
    );

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printNkcEntry(
        entry,
        loaiPhieuCuaButToan(entry),
        currentTenant?.tenantName ?? ""
      );
    } catch (e) {
      console.error("Error printing voucher:", e);
      message.error("Không in được phiếu");
    } finally {
      setPrinting(false);
    }
  };

  // Popconfirm không dùng được ở đây: menu đóng ngay khi bấm nên confirm bị gỡ
  // khỏi DOM trước khi người dùng kịp trả lời → dùng Modal.confirm.
  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xóa bút toán này?",
      content: `Số CT ${entry.soPhieu}`,
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () => handler.executeEvent("deleteEntry", { id: entry.id }),
    });
  };

  // Đang sửa tại chỗ (double-click) → chỉ còn Lưu / Hủy
  if (isThisRowEditing) {
    return (
      <Space size="small">
        <Tooltip title="Lưu">
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handler.executeEvent("saveEditRow", {})}
            loading={savingRow}
            className="!text-green-600 hover:!text-green-700"
          />
        </Tooltip>

        <Tooltip title="Hủy">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handler.executeEvent("cancelEditRow", {})}
            disabled={savingRow}
            className="!text-red-600 hover:!text-red-700"
          />
        </Tooltip>
      </Space>
    );
  }

  const items: MenuProps["items"] = [];

  if (canEdit) {
    items.push({
      key: "sua",
      icon: <EditOutlined />,
      label: isApproved ? "Sửa (đã duyệt)" : "Sửa",
      disabled: isApproved || isOtherRowEditing,
      onClick: handleEdit,
    });
  }

  if (canCreate) {
    items.push({
      key: "nhan-ban",
      icon: <CopyOutlined />,
      label: "Nhân bản",
      disabled: isOtherRowEditing,
      onClick: handleClone,
    });
  }

  items.push({
    key: "in",
    icon: <PrinterOutlined />,
    label: printing ? "Đang in..." : "In",
    disabled: printing,
    onClick: handlePrint,
  });

  if (canDelete) {
    items.push({ type: "divider" });
    items.push({
      key: "xoa",
      icon: <DeleteOutlined />,
      label: "Xóa",
      danger: true,
      disabled: isApproved || isOtherRowEditing,
      onClick: handleDelete,
    });
  }

  return (
    <Dropdown.Button
      size="small"
      type="link"
      trigger={["click"]}
      className="nkc-action-menu"
      menu={{ items }}
      onClick={handleView}
      buttonsRender={([left, right]) => [
        <Tooltip key="xem" title="Xem chi tiết">
          {left}
        </Tooltip>,
        right,
      ]}
      disabled={isOtherRowEditing}
    >
      <EyeOutlined /> Xem
    </Dropdown.Button>
  );
}
