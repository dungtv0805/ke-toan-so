import { useEffect } from 'react';
import { Modal, Form, Switch, Select } from 'antd';
import { useKhoaSoHandler, useKhoaSoState } from '../KhoaSoHandlerContext';
import { KhoaSoCauHinhDto, KyKhoaSo } from '@/services/khoaSoService';

const KY_OPTIONS: { value: KyKhoaSo; label: string }[] = [
  { value: 'NGAY', label: 'Hàng ngày' },
  { value: 'TUAN', label: 'Hàng tuần' },
  { value: 'THANG', label: 'Hàng tháng' },
  { value: 'QUY', label: 'Hàng quý' },
  { value: 'NAM', label: 'Hàng năm' },
];

const GIO_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, '0')}:00`,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export function ThietLapTuDongDialog() {
  const handler = useKhoaSoHandler();
  const [open] = useKhoaSoState('showCauHinhDialog', false);
  const [cauHinh] = useKhoaSoState('cauHinh', null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && cauHinh) {
      form.setFieldsValue({
        isActive: cauHinh.isActive,
        kyKhoaSo: cauHinh.kyKhoaSo,
        gioThucHien: cauHinh.gioThucHien,
      });
    } else if (open) {
      form.setFieldsValue({
        isActive: false,
        kyKhoaSo: 'NGAY',
        gioThucHien: '18:00',
      });
    }
  }, [open, cauHinh, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const dto: KhoaSoCauHinhDto = {
      kyKhoaSo: values.kyKhoaSo,
      gioThucHien: values.gioThucHien,
      isActive: values.isActive,
    };
    await handler.executeEvent('saveCauHinh', dto);
    handler.setState('showCauHinhDialog', false);
  };

  return (
    <Modal
      title="Thiết lập khóa sổ tự động"
      open={open}
      onOk={handleOk}
      onCancel={() => handler.setState('showCauHinhDialog', false)}
      okText="Đồng ý"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="isActive" label="Thực hiện khóa sổ tự động" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="kyKhoaSo" label="Kỳ khóa sổ" rules={[{ required: true }]}>
          <Select options={KY_OPTIONS} />
        </Form.Item>
        <Form.Item name="gioThucHien" label="Lúc" rules={[{ required: true }]}>
          <Select options={GIO_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
