import { Avatar, Button, List, Popconfirm, Space, Switch, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { NguoiDung, VaiTro } from "@/types";
import { vaiTroOptions, quyenHanTheoVaiTro } from "@/mock-data/nguoi-dung";
import { PhanQuyenHandler } from "../../phanQuyenHandler";

export const getVaiTroIcon = (vaiTro: VaiTro) => {
  switch (vaiTro) {
    case "ADMIN":
      return <CrownOutlined style={{ color: "#f5222d" }} />;
    case "KE_TOAN_QUY":
      return <SafetyCertificateOutlined style={{ color: "#1890ff" }} />;
    case "KE_TOAN_CONG_NO":
      return <SafetyCertificateOutlined style={{ color: "#fa8c16" }} />;
    case "KE_TOAN_TONG_HOP":
      return <SafetyCertificateOutlined style={{ color: "#722ed1" }} />;
    case "MANAGER":
      return <TeamOutlined style={{ color: "#52c41a" }} />;
    case "AUDITOR":
      return <SafetyCertificateOutlined style={{ color: "#13c2c2" }} />;
    default:
      return <UserOutlined />;
  }
};

export const getVaiTroTag = (vaiTro: VaiTro) => {
  const option = vaiTroOptions.find((vt) => vt.value === vaiTro);
  return option ? (
    <Tag color={option.color} icon={<SafetyCertificateOutlined />}>
      {option.label}
    </Tag>
  ) : (
    vaiTro
  );
};

export const createColumns = (handler: PhanQuyenHandler) => [
  {
    title: "Người dùng",
    key: "nguoiDung",
    render: (_: unknown, record: NguoiDung) => (
      <Space>
        <Avatar
          icon={getVaiTroIcon(record.vaiTro)}
          style={{
            backgroundColor: record.trangThai === "HOAT_DONG" ? "#e6f7ff" : "#f5f5f5",
          }}
        />
        <div>
          <div style={{ fontWeight: 500 }}>{record.hoTen}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.email}</div>
        </div>
      </Space>
    ),
  },
  {
    title: "Vai trò",
    dataIndex: "vaiTro",
    key: "vaiTro",
    render: (vaiTro: VaiTro) => getVaiTroTag(vaiTro),
  },
  {
    title: "Trạng thái",
    dataIndex: "trangThai",
    key: "trangThai",
    render: (trangThai: string, record: NguoiDung) => (
      <Space>
        <Switch
          checked={trangThai === "HOAT_DONG"}
          onChange={() => handler.executeEvent("toggleStatus", { id: record.id })}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
        <Tag color={trangThai === "HOAT_DONG" ? "success" : "default"}>
          {trangThai === "HOAT_DONG" ? "Hoạt động" : "Đã khóa"}
        </Tag>
      </Space>
    ),
  },
  {
    title: "Quyền hạn",
    key: "quyenHan",
    render: (_: unknown, record: NguoiDung) => {
      const quyenHan = quyenHanTheoVaiTro[record.vaiTro] || [];
      return (
        <Tooltip
          title={
            <List
              size="small"
              dataSource={quyenHan}
              renderItem={(item) => (
                <List.Item style={{ color: "#fff", padding: "4px 0" }}>{item}</List.Item>
              )}
            />
          }
        >
          <Button type="link" size="small">
            {quyenHan.length} quyền
          </Button>
        </Tooltip>
      );
    },
  },
  {
    title: "Thao tác",
    key: "action",
    width: 150,
    render: (_: unknown, record: NguoiDung) => (
      <Space>
        <Tooltip title="Sửa">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handler.executeEvent("openModal", { record })}
          />
        </Tooltip>
        <Popconfirm
          title="Xác nhận xóa?"
          description="Bạn có chắc muốn xóa người dùng này?"
          onConfirm={() => handler.executeEvent("deleteNguoiDung", { id: record.id })}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  },
];
