import { Modal, Form, Select, DatePicker, Radio, Input, Checkbox } from 'antd';
import { useKhoaSoHandler, useKhoaSoState } from '../KhoaSoHandlerContext';
import { CreateKhoaSoDto } from '@/services/khoaSoService';
import dayjs from 'dayjs';

export function KhoaSoTheoLoaiDialog() {
  const handler = useKhoaSoHandler();
  const [open] = useKhoaSoState('showKhoaSoDialog', false);
  const [loaiChungTuList] = useKhoaSoState('loaiChungTuList', []);
  const [nguoiDungList] = useKhoaSoState('nguoiDungList', []);
  const [form] = Form.useForm();

  const nguoiDungMode = Form.useWatch('nguoiDungMode', form);

  const handleOk = async () => {
    const values = await form.validateFields();
    const dto: CreateKhoaSoDto = {
      loaiChungTuMa: values.loaiChungTuMa || undefined,
      ngayKhoaSo: values.ngayKhoaSo.format('YYYY-MM-DD'),
      nguoiDungBiKhoa: values.nguoiDungMode === 'all' ? undefined : values.nguoiDungBiKhoa,
      dienGiai: values.dienGiai,
      coXuLyChuaGhiSo: values.coXuLyChuaGhiSo || false,
    };
    await handler.executeEvent('createKhoaSo', dto);
    handler.setState('showKhoaSoDialog', false);
    form.resetFields();
  };

  return (
    <Modal
      title="Khóa sổ/Bỏ khóa sổ theo Loại chứng từ"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        handler.setState('showKhoaSoDialog', false);
        form.resetFields();
      }}
      okText="Cất"
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={{ nguoiDungMode: 'all' }}>
        <Form.Item name="loaiChungTuMa" label="Loại chứng từ">
          <Select
            allowClear
            placeholder="Tất cả loại chứng từ"
            options={loaiChungTuList.map((l) => ({ value: l.ma, label: l.ten }))}
          />
        </Form.Item>

        <Form.Item name="ngayKhoaSo" label="Ngày khóa sổ" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} defaultValue={dayjs()} />
        </Form.Item>

        <Form.Item name="nguoiDungMode" label="Người dùng">
          <Radio.Group>
            <Radio value="all">Áp dụng với tất cả người dùng</Radio>
            <Radio value="selected">Chỉ áp dụng với người dùng được chọn</Radio>
          </Radio.Group>
        </Form.Item>

        {nguoiDungMode === 'selected' && (
          <Form.Item name="nguoiDungBiKhoa" rules={[{ required: true, message: 'Chọn ít nhất 1 người' }]}>
            <Select
              mode="multiple"
              placeholder="Chọn người dùng"
              options={nguoiDungList.map((n) => ({ value: n.id, label: `${n.hoTen} (${n.email})` }))}
            />
          </Form.Item>
        )}

        <Form.Item name="dienGiai" label="Diễn giải">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="coXuLyChuaGhiSo" valuePropName="checked">
          <Checkbox>Có xử lý chứng từ chưa ghi sổ</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
