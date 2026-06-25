import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, InputNumber, Row, Col } from "antd";
import { loaiTaiKhoan, nhomTaiKhoan } from "@/mock-data/tai-khoan";

const chiTietTheoOptions = [
  { value: "KHACH_HANG", label: "Khách hàng" },
  { value: "NHA_CUNG_CAP", label: "Nhà cung cấp" },
  { value: "NHAN_VIEN", label: "Nhân viên" },
  { value: "NHA_THAU", label: "Nhà thầu" },
  { value: "NGAN_HANG_QUY", label: "Ngân hàng & Quỹ" },
];

interface Values { ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddTaiKhoanModal({ open, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ capDo: 1 }); }
  }, [open, form]);

  const handleOk = async () => {
    let v: Values;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const ok = await onSubmit(v);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Thêm nhanh tài khoản"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="ma" label="Mã tài khoản" rules={[{ required: true, message: "Nhập mã" }, { max: 20, message: "Tối đa 20 ký tự" }]}>
              <Input placeholder="VD: 1388, 6428" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="capDo" label="Cấp độ" rules={[{ required: true, message: "Nhập cấp độ" }]}>
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="ten" label="Tên tài khoản" rules={[{ required: true, message: "Nhập tên" }, { max: 200, message: "Tối đa 200 ký tự" }]}>
          <Input placeholder="VD: Phải thu khác" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="loai" label="Loại tài khoản" rules={[{ required: true, message: "Chọn loại" }]}>
              <Select placeholder="Chọn loại" options={loaiTaiKhoan} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nhom" label="Nhóm tài khoản" rules={[{ required: true, message: "Chọn nhóm" }]}>
              <Select placeholder="Chọn nhóm" options={nhomTaiKhoan} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="chiTietTheo" label="Chi tiết theo" tooltip="Nếu TK cần theo dõi đối tượng (KH/NCC...) thì chọn ở đây">
          <Select allowClear placeholder="— Không chi tiết —" options={chiTietTheoOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
