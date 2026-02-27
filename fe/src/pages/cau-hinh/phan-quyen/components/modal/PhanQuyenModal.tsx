import { useEffect, useState } from "react";
import { Alert, Descriptions, Form, Input, Modal, Radio, Select, Space, Tag, message } from "antd";
import { CheckCircleOutlined, UserOutlined, InfoCircleOutlined, UserAddOutlined } from "@ant-design/icons";
import { z } from "zod";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import { vaiTroOptions, quyenHanTheoVaiTro } from "@/mock-data/nguoi-dung";
import { VaiTro } from "@/types";
import { nguoiDungService } from "@/services/nguoiDungService";
import "./PhanQuyenModal.state";

type AddMode = "new" | "existing";

const nguoiDungSchema = z.object({
  hoTen: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  vaiTro: z.enum(["ADMIN", "KE_TOAN_QUY", "KE_TOAN_CONG_NO", "KE_TOAN_TONG_HOP", "MANAGER", "AUDITOR"]),
  trangThai: z.enum(["HOAT_DONG", "KHOA"]),
});

export function PhanQuyenModal() {
  const handler = usePhanQuyenHandler();
  const [modalVisible] = usePhanQuyenState("modalVisible", false);
  const [editingRecord] = usePhanQuyenState("editingRecord", null);
  const [form] = Form.useForm();
  const [addMode, setAddMode] = useState<AddMode>("new");
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; email: string; hoTen: string }>>([]);

  useEffect(() => {
    if (modalVisible) {
      if (editingRecord) {
        form.setFieldsValue(editingRecord);
        setAddMode("new"); // Edit mode always uses the "new" form layout
      } else {
        form.resetFields();
        form.setFieldsValue({ trangThai: "HOAT_DONG" });
        setAddMode("new");
      }
    }
  }, [modalVisible, editingRecord, form]);

  useEffect(() => {
    if (modalVisible && !editingRecord && addMode === "existing") {
      nguoiDungService.getAvailableUsers().then(setAvailableUsers).catch(() => {});
    }
  }, [modalVisible, editingRecord, addMode]);

  const handleSubmit = async () => {
    try {
      if (!editingRecord && addMode === "existing") {
        const values = await form.validateFields();
        await handler.executeEvent("addExistingUser", {
          userId: values.existingUserId,
          vaiTro: values.vaiTro,
        });
        return;
      }

      const values = await form.validateFields();

      const validation = nguoiDungSchema.safeParse(values);
      if (!validation.success) {
        message.error(validation.error.errors[0].message);
        return;
      }

      const emailExists = await nguoiDungService.checkEmailExists(values.email, editingRecord?.id);
      if (emailExists) {
        message.error("Email đã tồn tại trong hệ thống!");
        return;
      }

      if (editingRecord) {
        await handler.executeEvent("updateNguoiDung", { id: editingRecord.id, data: values });
      } else {
        await handler.executeEvent("createNguoiDung", values);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    handler.executeEvent("closeModal", {});
  };

  const handleModeChange = (mode: AddMode) => {
    setAddMode(mode);
    form.resetFields();
    if (mode === "new") {
      form.setFieldsValue({ trangThai: "HOAT_DONG" });
    }
  };

  return (
    <Modal
      title={editingRecord ? "Sửa người dùng" : "Thêm người dùng"}
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={editingRecord ? "Cập nhật" : "Thêm"}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" className="mt-4">
        {/* Mode selector - only show when creating */}
        {!editingRecord && (
          <Form.Item label="Cách thêm">
            <Radio.Group value={addMode} onChange={(e) => handleModeChange(e.target.value)}>
              <Radio.Button value="new">
                <UserAddOutlined /> Tạo user mới
              </Radio.Button>
              <Radio.Button value="existing">
                <UserOutlined /> User có sẵn
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
        )}

        {/* Existing user mode */}
        {!editingRecord && addMode === "existing" ? (
          <>
            <Form.Item
              name="existingUserId"
              label="Chọn người dùng"
              rules={[{ required: true, message: "Vui lòng chọn người dùng!" }]}
            >
              <Select
                showSearch
                placeholder="Tìm người dùng..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase()) ||
                  (option?.email ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={availableUsers.map((u) => ({
                  value: u.id,
                  label: u.hoTen,
                  email: u.email,
                }))}
                optionRender={(option) => (
                  <div className="flex flex-col">
                    <span>{option.data.label}</span>
                    <span className="text-xs text-gray-400">{option.data.email}</span>
                  </div>
                )}
              />
            </Form.Item>

            <Form.Item
              name="vaiTro"
              label="Vai trò"
              rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
            >
              <Select placeholder="Chọn vai trò">
                {vaiTroOptions.map((vt) => (
                  <Select.Option key={vt.value} value={vt.value}>
                    <Space>
                      <Tag color={vt.color}>{vt.label}</Tag>
                      <span className="text-muted-foreground text-xs">{vt.description}</span>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        ) : (
          <>
            {/* New user mode / Edit mode */}
            {!editingRecord && (
              <Alert
                message="Mật khẩu mặc định"
                description="Người dùng mới sẽ được tạo với mật khẩu mặc định: 123456. Vui lòng thông báo để họ đổi mật khẩu sau khi đăng nhập."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                className="mb-4"
              />
            )}
            <Form.Item
              name="hoTen"
              label="Họ tên"
              rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
            >
              <Input placeholder="Nhập họ tên" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Vui lòng nhập email!" },
                { type: "email", message: "Email không hợp lệ!" },
              ]}
            >
              <Input placeholder="Nhập email" />
            </Form.Item>

            <Form.Item
              name="vaiTro"
              label="Vai trò"
              rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
            >
              <Select placeholder="Chọn vai trò">
                {vaiTroOptions.map((vt) => (
                  <Select.Option key={vt.value} value={vt.value}>
                    <Space>
                      <Tag color={vt.color}>{vt.label}</Tag>
                      <span className="text-muted-foreground text-xs">{vt.description}</span>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="trangThai"
              label="Trạng thái"
              rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
            >
              <Select placeholder="Chọn trạng thái">
                <Select.Option value="HOAT_DONG">
                  <Tag color="success">Hoạt động</Tag>
                </Select.Option>
                <Select.Option value="KHOA">
                  <Tag color="default">Khóa</Tag>
                </Select.Option>
              </Select>
            </Form.Item>
          </>
        )}

        {/* Permission preview */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.vaiTro !== currentValues.vaiTro}
        >
          {({ getFieldValue }) => {
            const vaiTro = getFieldValue("vaiTro") as VaiTro;
            if (!vaiTro) return null;

            const quyenHan = quyenHanTheoVaiTro[vaiTro] || [];
            return (
              <Descriptions title="Quyền hạn được cấp" bordered size="small" column={1}>
                {quyenHan.map((qh, index) => (
                  <Descriptions.Item
                    key={index}
                    label={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  >
                    {qh}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}
