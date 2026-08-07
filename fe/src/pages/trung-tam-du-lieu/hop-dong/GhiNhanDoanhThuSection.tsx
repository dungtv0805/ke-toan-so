import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { NhatKyChung, TaiKhoan, TheoDoiHopDongRow } from '@/types';
import { nhatKyChungService } from '@/services/nhatKyChungService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { TK_CHUA_THUC_HIEN, TK_DOANH_THU, tinhDoanhThuHopDong } from './ghiNhanDoanhThu';
import { defaultTaiKhoan, loadDonHangSnapshots, taiKhoanSnapshot } from './donHangChungTu';

const { Text } = Typography;

const fmtCur = (v?: number) =>
  !v ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(v));

interface FormValues {
  ngay: Dayjs;
  soTien: number;
  taiKhoanNo: string;
  taiKhoanCo: string;
  noiDung: string;
}

interface Props {
  hopDong: TheoDoiHopDongRow;
  canEdit: boolean;
}

/**
 * Khối "Ghi nhận doanh thu" trong Drawer đơn hàng: xem các lần đã ghi nhận và
 * sinh bút toán Nợ 3387 / Có 511 gắn sẵn đơn hàng.
 *
 * Chứng từ sinh ra là chứng từ Nhật ký chung bình thường (loai KHAC) — sửa/xóa ở
 * Nhật ký chung, không có bảng lưu riêng.
 */
export default function GhiNhanDoanhThuSection({ hopDong, canEdit }: Props) {
  const [entries, setEntries] = useState<NhatKyChung[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [form] = Form.useForm<FormValues>();

  const { ghiNhan, daGhiNhan, chuaGhiNhan } = useMemo(
    () => tinhDoanhThuHopDong(entries),
    [entries],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await nhatKyChungService.getByHopDong(hopDong.soHopDong));
    } catch {
      message.error('Không tải được các lần ghi nhận doanh thu');
    } finally {
      setLoading(false);
    }
  }, [hopDong.soHopDong]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    taiKhoanService
      .getLeafAccounts()
      .then(setTaiKhoanList)
      .catch(() => setTaiKhoanList([]));
  }, []);

  const openModal = () => {
    form.setFieldsValue({
      ngay: dayjs(),
      soTien: chuaGhiNhan > 0 ? chuaGhiNhan : undefined,
      taiKhoanNo: defaultTaiKhoan(taiKhoanList, TK_CHUA_THUC_HIEN),
      taiKhoanCo: defaultTaiKhoan(taiKhoanList, TK_DOANH_THU),
      noiDung: `Ghi nhận doanh thu ${hopDong.soHopDong}`,
    } as FormValues);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const snap = await loadDonHangSnapshots(hopDong.hopDongId, hopDong.doiTuongId);

      await nhatKyChungService.create({
        loai: 'KHAC',
        ngay: v.ngay.format('YYYY-MM-DD'),
        ngayGhiSo: v.ngay.format('YYYY-MM-DD'),
        soTien: v.soTien,
        noiDung: v.noiDung,
        danhMuc: {
          taiKhoanNo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanNo),
          taiKhoanCo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanCo),
          hopDong: snap.hopDong,
          // Cả hai bên đều là công nợ/doanh thu của khách hàng này
          ...(snap.khachHang
            ? { doiTuong: snap.khachHang, doiTuong2: snap.khachHang }
            : {}),
        },
      });
      message.success('Đã ghi nhận doanh thu');
      setOpen(false);
      load();
    } catch (e) {
      const err = e as { errorFields?: unknown; message?: string };
      if (!err.errorFields) message.error(err.message || 'Ghi nhận doanh thu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<NhatKyChung> = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 110,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    { title: 'Số chứng từ', dataIndex: 'soPhieu', key: 'soPhieu', width: 130 },
    {
      title: 'Số tiền',
      dataIndex: 'soTien',
      key: 'soTien',
      width: 150,
      align: 'right',
      render: (v: number) => fmtCur(v),
    },
    { title: 'Diễn giải', dataIndex: 'dienGiai', key: 'dienGiai', ellipsis: true },
  ];

  const taiKhoanOptions = taiKhoanList.map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  return (
    <>
      <Row gutter={12} align="middle" className="mb-2">
        <Col flex="auto">
          <Text type="secondary">Đã ghi nhận: </Text>
          <Text strong type="success">{fmtCur(daGhiNhan)}</Text>
          <Text type="secondary"> · Chưa ghi nhận: </Text>
          <Text strong type="warning">{fmtCur(chuaGhiNhan)}</Text>
        </Col>
        {canEdit && (
          <Col>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openModal}>
              Ghi nhận doanh thu
            </Button>
          </Col>
        )}
      </Row>
      <Table
        size="small"
        rowKey={(r) => r.id || ''}
        loading={loading}
        columns={columns}
        dataSource={ghiNhan}
        pagination={false}
        locale={{ emptyText: 'Chưa ghi nhận doanh thu lần nào' }}
      />

      <Modal
        title={`Ghi nhận doanh thu — ${hopDong.soHopDong}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Ghi nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-3">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ngay"
                label="Ngày ghi nhận"
                rules={[{ required: true, message: 'Chọn ngày ghi nhận' }]}
                tooltip="Doanh thu lên báo cáo theo tháng của ngày này"
              >
                <DatePicker format="DD/MM/YYYY" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="soTien"
                label="Số tiền"
                rules={[{ required: true, message: 'Nhập số tiền' }]}
              >
                <InputNumber<number>
                  className="w-full"
                  min={1}
                  controls={false}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => Number(`${v}`.replace(/,/g, ''))}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="taiKhoanNo"
                label="TK Nợ"
                rules={[{ required: true, message: 'Chọn TK Nợ' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taiKhoanCo"
                label="TK Có"
                rules={[{ required: true, message: 'Chọn TK Có' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="noiDung"
            label="Diễn giải"
            rules={[{ required: true, message: 'Nhập diễn giải' }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            Hệ thống tạo một chứng từ Nhật ký chung gắn sẵn đơn hàng này. Sửa hoặc xóa
            tại Chứng từ → Nhật ký chung.
          </Text>
        </Form>
      </Modal>
    </>
  );
}
