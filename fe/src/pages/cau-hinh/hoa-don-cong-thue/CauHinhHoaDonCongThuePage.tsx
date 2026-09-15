import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  TimePicker,
  Typography,
  Alert,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useManHinh } from '@/hooks/useManHinh';
import { nutLenh } from '@/components/common/nutLenh';
import {
  hoaDonCongThueService,
  type CongTyCongThue,
} from '@/services/hoaDonCongThueService';

const { Text } = Typography;

/**
 * Cấu hình tải hóa đơn cổng Thuế — khai báo từng công ty.
 *
 * Đây là chỗ đặt MỘT LẦN rồi hiếm khi sửa: mã số thuế, mật khẩu cổng Thuế, kỳ
 * kê khai và lịch tải riêng. Việc hằng ngày — đăng nhập captcha, tải hàng loạt
 * — nằm ở Thuế › Hóa đơn cổng Thuế, vì kế toán viên làm việc đó mỗi sáng và
 * không nên phải có quyền cấu hình mới vào được.
 */
const CauHinhHoaDonCongThuePage: React.FC = () => {
  const gon = useManHinh() === 'mobile';
  const [form] = Form.useForm();

  const [ds, setDs] = useState<CongTyCongThue[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [mo, setMo] = useState(false);
  const [dangSua, setDangSua] = useState<CongTyCongThue | null>(null);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      setDs((await hoaDonCongThueService.danhSachCongTy()) ?? []);
    } catch (e: any) {
      message.error(e?.message || 'Không tải được danh sách');
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    nap();
  }, [nap]);

  function moThem() {
    setDangSua(null);
    form.resetFields();
    form.setFieldsValue({ kyKeKhai: 'thang' });
    setMo(true);
  }

  function moSua(c: CongTyCongThue) {
    setDangSua(c);
    form.setFieldsValue({
      mst: c.mst,
      tenCongTy: c.tenCongTy,
      tenDangNhap: c.tenDangNhap,
      kyKeKhai: c.kyKeKhai,
      matKhau: '',
    });
    setMo(true);
  }

  async function luu() {
    try {
      const v = await form.validateFields();
      await hoaDonCongThueService.luuCongTy({
        mst: String(v.mst).trim(),
        tenCongTy: v.tenCongTy?.trim(),
        tenDangNhap: v.tenDangNhap?.trim() || String(v.mst).trim(),
        // Để trống khi sửa = giữ nguyên mật khẩu cũ, không phải xóa đi.
        matKhau: v.matKhau || null,
        kyKeKhai: v.kyKeKhai,
      });
      setMo(false);
      await nap();
      message.success(dangSua ? 'Đã cập nhật' : 'Đã thêm mã số thuế');
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Lưu không được');
    }
  }

  async function quenMatKhau(c: CongTyCongThue) {
    try {
      await hoaDonCongThueService.quenMatKhau(c.mst);
      await nap();
      message.success(`Đã xóa mật khẩu đã lưu của ${c.mst}`);
    } catch (e: any) {
      message.error(e?.message || 'Không xóa được');
    }
  }

  /** Bật/tắt và chỉnh lịch ngay trên dòng — đây là thứ hay phải sửa nhất. */
  async function doiLich(c: CongTyCongThue, thayDoi: Partial<CongTyCongThue>) {
    try {
      await hoaDonCongThueService.datLich(c.mst, {
        tuDongTai: thayDoi.tuDongTai ?? c.tuDongTai,
        gioChay: thayDoi.gioChay ?? c.gioChay,
        soNgayKeoLai: thayDoi.soNgayKeoLai ?? c.soNgayKeoLai,
      });
      await nap();
    } catch (e: any) {
      message.error(e?.message || 'Không đặt được lịch');
      await nap();
    }
  }

  const columns = [
    {
      title: 'Mã số thuế',
      dataIndex: 'mst',
      width: 130,
      render: (v: string) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    { title: 'Công ty', dataIndex: 'tenCongTy', render: (v: string) => v || <Text type="secondary">—</Text> },
    {
      title: 'Kỳ kê khai',
      dataIndex: 'kyKeKhai',
      width: 110,
      render: (v: string) => (v === 'quy' ? 'Theo quý' : 'Theo tháng'),
    },
    {
      title: 'Mật khẩu',
      dataIndex: 'coLuuMatKhau',
      width: 120,
      render: (v: boolean) =>
        v ? <Tag color="green">Đã lưu</Tag> : <Tag>Không lưu</Tag>,
    },
    {
      title: 'Tự động tải',
      dataIndex: 'tuDongTai',
      width: 110,
      render: (v: boolean, c: CongTyCongThue) => (
        <Tooltip title={c.coLuuMatKhau ? '' : 'Phải lưu mật khẩu mới tự tải được'}>
          <Switch
            size="small"
            checked={v}
            disabled={!c.coLuuMatKhau}
            onChange={(x) => doiLich(c, { tuDongTai: x })}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Giờ chạy',
      dataIndex: 'gioChay',
      width: 120,
      render: (v: string, c: CongTyCongThue) => (
        <TimePicker
          size="small"
          format="HH:mm"
          allowClear={false}
          disabled={!c.tuDongTai}
          value={v ? dayjs(v, 'HH:mm') : null}
          onChange={(d) => d && doiLich(c, { gioChay: d.format('HH:mm') })}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Kéo lại',
      dataIndex: 'soNgayKeoLai',
      width: 120,
      render: (v: number, c: CongTyCongThue) => (
        <InputNumber
          size="small"
          min={1}
          max={90}
          value={v}
          disabled={!c.tuDongTai}
          addonAfter="ngày"
          onChange={(x) => x && doiLich(c, { soNgayKeoLai: Number(x) })}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: '',
      key: 'thaoTac',
      width: 90,
      align: 'right' as const,
      render: (_: unknown, c: CongTyCongThue) => (
        <Space size={0}>
          <Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => moSua(c)} />
          </Tooltip>
          {c.coLuuMatKhau && (
            <Popconfirm
              title="Xóa mật khẩu đã lưu?"
              description="Từ đó mỗi phiên kế toán phải tự nhập mật khẩu, và lịch tự động sẽ tắt."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => quenMatKhau(c)}
            >
              <Tooltip title="Xóa mật khẩu đã lưu">
                <Button type="text" icon={<KeyOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title="Hóa đơn cổng Thuế"
        extra={nutLenh(gon, 'Thêm mã số thuế', {
          type: 'primary',
          icon: <PlusOutlined />,
          onClick: moThem,
        })}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Khai báo một lần, dùng dài"
          description={
            <>
              Đây là nơi khai báo mã số thuế và lịch tải riêng cho từng công ty. Việc tải hằng ngày
              — đăng nhập captcha, tải hàng loạt — nằm ở <Text strong>Thuế › Hóa đơn cổng Thuế</Text>.
            </>
          }
        />

        <Table
          rowKey="mst"
          size="small"
          loading={dangTai}
          dataSource={ds}
          columns={columns}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa khai báo mã số thuế nào' }}
        />
      </Card>

      <Card size="small">
        <Space direction="vertical" size={6}>
          <Text type="secondary">
            <Text strong>Hai chế độ mật khẩu.</Text> Có lưu thì mỗi phiên chỉ cần gõ captcha, và mới
            đặt được lịch tự động. Không lưu thì kế toán nhập mật khẩu mỗi phiên, hệ thống không giữ
            lại gì — an toàn hơn cho công ty nhạy cảm, nhưng máy không tự tải thay bạn được.
          </Text>
          <Text type="secondary">
            <Text strong>Kéo lại N ngày là có chủ đích.</Text> Hóa đơn lên cổng Thuế trễ vài ngày so
            với ngày lập, và hóa đơn bị thay thế hay điều chỉnh về sau cũng cần cập nhật lại. Cơ chế
            chống trùng đảm bảo không sinh bản ghi thừa.
          </Text>
        </Space>
      </Card>

      <Modal
        open={mo}
        title={dangSua ? `Sửa ${dangSua.mst}` : 'Thêm mã số thuế'}
        onCancel={() => setMo(false)}
        onOk={luu}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="mst"
            label="Mã số thuế"
            rules={[{ required: true, message: 'Nhập mã số thuế' }]}
          >
            <Input disabled={Boolean(dangSua)} inputMode="numeric" />
          </Form.Item>

          <Form.Item name="tenCongTy" label="Tên công ty">
            <Input />
          </Form.Item>

          <Form.Item
            name="tenDangNhap"
            label="Tên đăng nhập cổng Thuế"
            extra="Để trống thì dùng chính mã số thuế"
          >
            <Input />
          </Form.Item>

          <Form.Item name="kyKeKhai" label="Kỳ kê khai">
            <Select
              options={[
                { value: 'thang', label: 'Theo tháng' },
                { value: 'quy', label: 'Theo quý' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="matKhau"
            label="Mật khẩu cổng Thuế"
            extra={
              dangSua
                ? 'Để trống = giữ nguyên mật khẩu cũ'
                : 'Để trống nếu không muốn hệ thống lưu mật khẩu'
            }
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CauHinhHoaDonCongThuePage;
