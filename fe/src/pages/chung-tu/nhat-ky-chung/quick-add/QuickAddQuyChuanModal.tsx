import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Row, Col } from "antd";

interface Values { nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  loaiGiaoDichLabel: string;
  taiKhoanOptions: { value: string; label: string }[];
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddQuyChuanModal({ open, onClose, loaiGiaoDichLabel, taiKhoanOptions, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

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
      title="Thêm nhanh nghiệp vụ (quy chuẩn)"
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
        <Form.Item label="Loại giao dịch">
          <span className="font-medium">{loaiGiaoDichLabel}</span>
        </Form.Item>
        <Form.Item name="nghiepVu" label="Nghiệp vụ" rules={[{ required: true, message: "Nhập nghiệp vụ" }, { max: 100, message: "Tối đa 100 ký tự" }]}>
          <Input placeholder="VD: Thu tiền bán hàng" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="taiKhoanNo" label="TK Nợ" rules={[{ required: true, message: "Chọn TK Nợ" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn TK Nợ" options={taiKhoanOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanCo" label="TK Có" rules={[{ required: true, message: "Chọn TK Có" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn TK Có" options={taiKhoanOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="moTa" label="Mô tả" rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}>
          <Input.TextArea rows={2} placeholder="Mô tả (sẽ dùng làm diễn giải mặc định)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
