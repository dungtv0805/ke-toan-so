import { useEffect, useState } from 'react';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { TrangThaiHopDong, type DoiTuong } from '@/types';
import { hopDongService } from '@/services/hopDongService';
import { doiTuongService } from '@/services/doiTuongService';
import { THUE_SUAT_OPTIONS, tinhTienThue } from '@/services/taxService';

const { Text } = Typography;

const TRANG_THAI_OPTIONS = [
  { value: TrangThaiHopDong.CHUA_CO_HD, label: 'Chưa có HĐ' },
  { value: TrangThaiHopDong.HD_CHUA_KY, label: 'HĐ chưa ký' },
  { value: TrangThaiHopDong.HD_PHOTO_SCAN, label: 'HĐ photo/scan' },
  { value: TrangThaiHopDong.HD_GOC, label: 'HĐ gốc' },
];

const moneyProps = {
  className: 'w-full',
  formatter: (value?: string | number) =>
    `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  parser: (value?: string) => (value?.replace(/[^\d.-]/g, '') ?? '') as unknown as number,
};

interface FormValues {
  soHopDong: string;
  tenCongTrinh: string;
  nam?: number;
  ngayKy?: Dayjs;
  giaTriTruocThue?: number;
  thueSuat?: string;
  tienThue?: number;
  giaTriSauThue?: number;
  doiTuongId?: string;
  trangThai?: TrangThaiHopDong;
}

interface Props {
  /** Gọi sau khi tạo xong để tải lại danh sách theo dõi. */
  onCreated: () => void;
}

/**
 * Nút "+ Tạo hợp đồng" ngay trên trang Quản lý hợp đồng — nhập các trường chính
 * để hợp đồng xuất hiện trong danh sách theo dõi ngay. Các phần còn lại (phụ lục,
 * bảo hành, tiến độ thi công, điều khoản thanh toán) sửa ở Danh mục → Hợp đồng.
 */
export default function TaoNhanhHopDongModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doiTuongList, setDoiTuongList] = useState<DoiTuong[]>([]);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    doiTuongService.getAll().then(setDoiTuongList).catch(() => setDoiTuongList([]));
  }, []);

  const openModal = () => {
    form.resetFields();
    form.setFieldsValue({ nam: dayjs().year(), trangThai: TrangThaiHopDong.HD_CHUA_KY });
    setOpen(true);
  };

  /**
   * Liên động giá trị: đổi trước thuế / thuế suất → tính lại tiền thuế và sau thuế;
   * sửa tay tiền thuế → sau thuế bám theo; sửa tay sau thuế → không đụng gì (hợp đồng
   * cũ nhiều khi chỉ ghi mỗi số tổng).
   */
  const onValuesChange = (changed: Partial<FormValues>, all: FormValues) => {
    const truocThue = Number(all.giaTriTruocThue) || 0;
    if ('giaTriTruocThue' in changed || 'thueSuat' in changed) {
      const thue = tinhTienThue(truocThue, all.thueSuat);
      form.setFieldsValue({ tienThue: thue, giaTriSauThue: truocThue + thue });
      return;
    }
    if ('tienThue' in changed) {
      form.setFieldValue('giaTriSauThue', truocThue + (Number(all.tienThue) || 0));
    }
  };

  const handleOk = async () => {
    let v: FormValues;
    try {
      v = await form.validateFields();
    } catch {
      return; // lỗi validate — antd đã hiện dưới từng ô
    }
    setSaving(true);
    try {
      await hopDongService.create({
        soHopDong: v.soHopDong.trim(),
        tenCongTrinh: v.tenCongTrinh.trim(),
        nam: v.nam,
        ngayKy: v.ngayKy?.format('YYYY-MM-DD'),
        giaTriTruocThue: v.giaTriTruocThue,
        thueSuat: v.thueSuat,
        tienThue: v.tienThue,
        giaTriSauThue: v.giaTriSauThue,
        doiTuongId: v.doiTuongId,
        trangThai: v.trangThai,
      });
      message.success('Đã tạo hợp đồng');
      setOpen(false);
      onCreated();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Tạo hợp đồng thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
        Tạo hợp đồng
      </Button>

      <Modal
        title="Tạo nhanh hợp đồng"
        open={open}
        onOk={handleOk}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Tạo"
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          size="small"
          className="pt-2"
          onValuesChange={onValuesChange}
        >
          <Row gutter={12}>
            <Col span={9}>
              <Form.Item
                name="soHopDong"
                label="Số hợp đồng"
                rules={[
                  { required: true, message: 'Vui lòng nhập số hợp đồng' },
                  { max: 50, message: 'Tối đa 50 ký tự' },
                ]}
              >
                <Input placeholder="VD: HD-2026-001" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="nam" label="Năm">
                <InputNumber className="w-full" min={1900} max={2200} controls={false} />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="ngayKy" label="Ngày ký">
                <DatePicker
                  format="DD/MM/YYYY"
                  className="w-full"
                  placeholder="Chọn ngày ký"
                  onChange={(d) => d && form.setFieldValue('nam', d.year())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tenCongTrinh"
            label="Tên công trình"
            rules={[
              { required: true, message: 'Vui lòng nhập tên công trình' },
              { max: 500, message: 'Tối đa 500 ký tự' },
            ]}
          >
            <Input.TextArea placeholder="Nhập tên công trình..." autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={9}>
              <Form.Item name="giaTriTruocThue" label="Giá trị trước thuế">
                <InputNumber {...moneyProps} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="thueSuat" label="Thuế suất">
                <Select options={THUE_SUAT_OPTIONS} allowClear placeholder="Chọn" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tienThue"
                label="Tiền thuế"
                tooltip="Tự tính khi đổi giá trị trước thuế hoặc thuế suất; vẫn sửa tay được"
              >
                <InputNumber {...moneyProps} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="giaTriSauThue"
                label="Giá trị sau thuế"
                tooltip="Tự cộng trước thuế + tiền thuế; sửa tay được nếu hợp đồng chỉ ghi số tổng"
              >
                <InputNumber {...moneyProps} placeholder="0" addonAfter="VNĐ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trangThai" label="Trạng thái">
                <Select options={TRANG_THAI_OPTIONS} allowClear placeholder="Chọn trạng thái" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="doiTuongId" label="Chủ đầu tư">
            <Select
              placeholder="Chọn chủ đầu tư"
              allowClear
              showSearch
              optionFilterProp="label"
              options={doiTuongList.map((dt) => ({ value: dt.id, label: `${dt.ma} - ${dt.ten}` }))}
            />
          </Form.Item>

          <Text type="secondary" className="text-xs">
            Phụ lục, bảo hành, tiến độ thi công… bổ sung sau ở Danh mục → Hợp đồng.
          </Text>
        </Form>
      </Modal>
    </>
  );
}
