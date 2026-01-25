import { useEffect } from "react";
import { Alert, Descriptions, Form, Input, Modal, Select, Space, Tag, message } from "antd";
import { CheckCircleOutlined, UserOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { z } from "zod";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import { vaiTroOptions, quyenHanTheoVaiTro } from "@/mock-data/nguoi-dung";
import { VaiTro } from "@/types";
import { nguoiDungService } from "@/services/nguoiDungService";
import "./PhanQuyenModal.state";

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

  useEffect(() => {
    if (modalVisible) {
      if (editingRecord) {
        form.setFieldsValue(editingRecord);
      } else {
        form.resetFields();
        form.setFieldsValue({ trangThai: "HOAT_DONG" });
      }
    }
  }, [modalVisible, editingRecord, form]);

  const handleSubmit = async () => {
    try {
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

  return (
    <Modal
      title={editingRecord ? "Sửa người dùng" : "Thêm người dùng mới"}
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={editingRecord ? "Cập nhật" : "Thêm mới"}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" className="mt-4">
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
