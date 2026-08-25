/**
 * Bảng "Hạch toán" ở trang này CHỈ cho sửa Diễn giải + Số tiền, và xóa dòng —
 * KHÔNG có nút "Thêm dòng" thủ công. Mỗi dòng ứng với một cặp tài khoản kết
 * chuyển (gộp 1 dòng/cặp TK, không tách theo bộ phận/dự án); muốn có thêm cặp
 * TK thì khai vào danh mục Tài khoản kết chuyển rồi bấm lại "Lấy dữ liệu".
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { ketChuyenService } from '@/services/ketChuyenService';
import {
  dienGiaiMacDinh,
  dinhDangTien,
  moTaCanhBao,
  tongSoTien,
  type CanhBaoKetChuyen,
  type DongHachToan,
} from './ketChuyenTinhToan';

const { Text, Title } = Typography;
const DATE_FMT = 'YYYY-MM-DD';

const KetChuyenLaiLoFormPage: React.FC = () => {
  const navigate = useNavigate();

  const [denNgay, setDenNgay] = useState<Dayjs>(dayjs());
  const [ngayHachToan, setNgayHachToan] = useState<Dayjs>(dayjs());
  const [ngayChungTu, setNgayChungTu] = useState<Dayjs>(dayjs());
  const [dienGiai, setDienGiai] = useState<string>(() => dienGiaiMacDinh(dayjs().format(DATE_FMT)));
  const [daSuaDienGiai, setDaSuaDienGiai] = useState(false);

  const [dong, setDong] = useState<DongHachToan[]>([]);
  const [canhBao, setCanhBao] = useState<CanhBaoKetChuyen[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Diễn giải tự cập nhật theo ngày kết chuyển — trừ khi người dùng đã tự sửa tay.
  useEffect(() => {
    if (!daSuaDienGiai) setDienGiai(dienGiaiMacDinh(denNgay.format(DATE_FMT)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denNgay]);

  const handleLayDuLieu = async () => {
    setLoadingPreview(true);
    try {
      const result = await ketChuyenService.preview(denNgay.format(DATE_FMT));
      setDong(result.dong);
      setCanhBao(result.canhBao);
    } catch {
      message.error('Không lấy được dữ liệu kết chuyển');
    } finally {
      setLoadingPreview(false);
    }
  };

  const patchDong = (maKetChuyen: string, patch: Partial<DongHachToan>) =>
    setDong((prev) => prev.map((d) => (d.maKetChuyen === maKetChuyen ? { ...d, ...patch } : d)));

  const removeDong = (maKetChuyen: string) =>
    setDong((prev) => prev.filter((d) => d.maKetChuyen !== maKetChuyen));

  const handleSave = async () => {
    if (dong.length === 0) {
      message.warning('Chưa có dòng hạch toán nào để lưu');
      return;
    }
    setSaving(true);
    try {
      const result = await ketChuyenService.create({
        denNgay: denNgay.format(DATE_FMT),
        ngayHachToan: ngayHachToan.format(DATE_FMT),
        ngayChungTu: ngayChungTu.format(DATE_FMT),
        dienGiai,
        dong,
      });
      message.success(`Đã lập chứng từ kết chuyển ${result.soPhieu}`);
      navigate('/chung-tu/ket-chuyen-lai-lo');
    } catch (error) {
      // Không nuốt lỗi: BE từ chối (400) khi không còn gì để kết chuyển đến ngày đó,
      // kế toán cần thấy đúng lý do này thay vì một thông báo chung chung.
      message.error((error as Error)?.message || 'Lập chứng từ kết chuyển thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<DongHachToan> = [
    {
      title: '#',
      key: 'stt',
      width: 50,
      render: (_: unknown, __: DongHachToan, index: number) => index + 1,
    },
    {
      title: 'Diễn giải',
      dataIndex: 'dienGiai',
      key: 'dienGiai',
      render: (v: string, record: DongHachToan) => (
        <Input
          value={v}
          onChange={(e) => patchDong(record.maKetChuyen, { dienGiai: e.target.value })}
        />
      ),
    },
    { title: 'TK Nợ', dataIndex: 'taiKhoanNo', key: 'taiKhoanNo', width: 100 },
    { title: 'TK Có', dataIndex: 'taiKhoanCo', key: 'taiKhoanCo', width: 100 },
    {
      title: 'Số tiền',
      dataIndex: 'soTien',
      key: 'soTien',
      width: 180,
      align: 'right' as const,
      render: (v: number, record: DongHachToan) => (
        <InputNumber
          style={{ width: '100%' }}
          value={v}
          min={0}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/,/g, ''))}
          onChange={(val) => patchDong(record.maKetChuyen, { soTien: Number(val) || 0 })}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: DongHachToan) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeDong(record.maKetChuyen)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/chung-tu/ket-chuyen-lai-lo')}
        />
        <Title level={4} style={{ margin: 0 }}>Kết chuyển lãi lỗ</Title>
      </div>

      <Card>
        <Row gutter={24}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div><Text>Kết chuyển đến ngày</Text></div>
                <Space>
                  <DatePicker
                    value={denNgay}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    onChange={(d) => d && setDenNgay(d)}
                  />
                  <Button onClick={handleLayDuLieu} loading={loadingPreview}>
                    Lấy dữ liệu
                  </Button>
                </Space>
              </div>
              <div>
                <div><Text>Diễn giải</Text></div>
                <Input
                  value={dienGiai}
                  onChange={(e) => {
                    setDienGiai(e.target.value);
                    setDaSuaDienGiai(true);
                  }}
                />
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div><Text>Ngày hạch toán</Text></div>
                <DatePicker
                  style={{ width: '100%' }}
                  value={ngayHachToan}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  onChange={(d) => d && setNgayHachToan(d)}
                />
              </div>
              <div>
                <div><Text>Ngày chứng từ</Text></div>
                <DatePicker
                  style={{ width: '100%' }}
                  value={ngayChungTu}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  onChange={(d) => d && setNgayChungTu(d)}
                />
              </div>
              <div>
                <div><Text>Số chứng từ</Text></div>
                <Input disabled placeholder="Tự sinh khi lưu" />
              </div>
            </Space>
          </Col>
        </Row>

        {canhBao.length > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="Còn tài khoản chưa được kết chuyển"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                {canhBao.map((c) => <li key={c.ma}>{moTaCanhBao(c)}</li>)}
              </ul>
            }
            action={<Link to="/danh-muc/tai-khoan-ket-chuyen">Mở danh mục</Link>}
          />
        )}
      </Card>

      <Card title="Hạch toán">
        <Table<DongHachToan>
          rowKey="maKetChuyen"
          dataSource={dong}
          columns={columns}
          pagination={false}
          locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
          summary={() =>
            dong.length > 0 ? (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>Tổng cộng</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{dinhDangTien(tongSoTien(dong))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
        <Space style={{ marginTop: 16 }}>
          <Popconfirm
            title="Xóa hết dòng hạch toán?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => setDong([])}
            disabled={dong.length === 0}
          >
            <Button danger disabled={dong.length === 0}>Xóa hết dòng</Button>
          </Popconfirm>
        </Space>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Lưu
        </Button>
      </div>
    </div>
  );
};

export default KetChuyenLaiLoFormPage;
