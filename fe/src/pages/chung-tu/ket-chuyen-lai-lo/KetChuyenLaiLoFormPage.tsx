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
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { ketChuyenService } from '@/services/ketChuyenService';
import { loaiGiaoDichService } from '@/services/loaiGiaoDichService';
import type { LoaiGiaoDich } from '@/types';
import { chonMacDinh, thieuLoaiGiaoDich, tienToSoPhieu } from './loaiGiaoDichLo';
import {
  boKhoaDong,
  dienGiaiMacDinh,
  dinhDangTien,
  ganKhoaDong,
  moTaCanhBao,
  suaDong,
  tongSoTien,
  xoaDong,
  type CanhBaoKetChuyen,
  type DongHachToanCoKhoa,
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
  const [daSuaNgayHachToan, setDaSuaNgayHachToan] = useState(false);
  const [daSuaNgayChungTu, setDaSuaNgayChungTu] = useState(false);

  const [loaiGiaoDich, setLoaiGiaoDich] = useState<LoaiGiaoDich[]>([]);
  const [loaiGiaoDichMa, setLoaiGiaoDichMa] = useState<string>();

  const [dong, setDong] = useState<DongHachToanCoKhoa[]>([]);
  const [canhBao, setCanhBao] = useState<CanhBaoKetChuyen[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Diễn giải, ngày hạch toán và ngày chứng từ tự bám theo ngày kết chuyển — trừ khi
  // người dùng đã tự sửa tay ô đó (mỗi ô một cờ riêng).
  //
  // Bắt buộc phải đồng bộ ngày hạch toán: BE chỉ tính phần chênh trong cửa sổ
  // [01/01 năm của denNgay, denNgay]. Chốt năm cũ (denNgay = 31/12/2025) mà để ngày
  // hạch toán mặc định là hôm nay (2026) thì lô rơi vào sai năm, TK 5/6/7/8 của 2025
  // không bao giờ sạch và mỗi lần Lưu lại nhân bản toàn bộ lô.
  useEffect(() => {
    if (!daSuaDienGiai) setDienGiai(dienGiaiMacDinh(denNgay.format(DATE_FMT)));
    if (!daSuaNgayHachToan) setNgayHachToan(denNgay);
    if (!daSuaNgayChungTu) setNgayChungTu(denNgay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denNgay]);

  // Loại giao dịch của lô: mỗi công ty đặt một mã riêng nên không thể fix cứng — lấy
  // danh mục của công ty và chọn sẵn mã đã dùng lần trước (BE lưu sau mỗi lần ghi sổ).
  useEffect(() => {
    (async () => {
      try {
        const [ds, cauHinh] = await Promise.all([
          loaiGiaoDichService.getAll(),
          ketChuyenService.getCauHinh().catch(() => ({ loaiGiaoDichMa: undefined })),
        ]);
        setLoaiGiaoDich(ds);
        setLoaiGiaoDichMa(chonMacDinh(cauHinh.loaiGiaoDichMa, ds));
      } catch {
        message.error('Không tải được danh mục Loại giao dịch');
      }
    })();
  }, []);

  const handleLayDuLieu = async () => {
    setLoadingPreview(true);
    try {
      const result = await ketChuyenService.preview(denNgay.format(DATE_FMT));
      setDong(ganKhoaDong(result.dong));
      setCanhBao(result.canhBao);
    } catch {
      message.error('Không lấy được dữ liệu kết chuyển');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Sửa/xóa theo `khoa` chứ KHÔNG theo `maKetChuyen`: nhiều dòng có thể cùng một mã
  // kết chuyển (một dòng cho mỗi tài khoản chi tiết), dùng mã sẽ đụng nhầm dòng khác.
  const patchDong = (khoa: string, patch: Partial<DongHachToanCoKhoa>) =>
    setDong((prev) => suaDong(prev, khoa, patch));

  const removeDong = (khoa: string) => setDong((prev) => xoaDong(prev, khoa));

  const handleSave = async () => {
    if (dong.length === 0) {
      message.warning('Chưa có dòng hạch toán nào để lưu');
      return;
    }
    // Chỉ ép chọn khi công ty thực sự có danh mục Loại giao dịch; công ty chưa khai gì
    // vẫn ghi sổ được như trước (số phiếu về tiền tố NVK).
    if (thieuLoaiGiaoDich(loaiGiaoDich, loaiGiaoDichMa)) {
      message.warning('Chọn Loại giao dịch cho bút toán kết chuyển');
      return;
    }
    setSaving(true);
    try {
      const result = await ketChuyenService.create({
        denNgay: denNgay.format(DATE_FMT),
        ngayHachToan: ngayHachToan.format(DATE_FMT),
        ngayChungTu: ngayChungTu.format(DATE_FMT),
        dienGiai,
        loaiGiaoDichMa,
        // Bỏ `khoa` — hợp đồng gửi lên BE giữ nguyên đúng các field của DTO.
        dong: boKhoaDong(dong),
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

  // Tiền tố số phiếu bám theo Loại chứng từ mà Loại giao dịch trỏ tới — cho kế toán
  // thấy trước số sẽ sinh ra thay vì đợi lưu xong mới biết.
  const goiYSoChungTu =
    `Tự sinh khi lưu (${tienToSoPhieu(loaiGiaoDich, loaiGiaoDichMa)}` +
    `${ngayChungTu.format('YYYYMM')}/...)`;

  const columns: ColumnsType<DongHachToanCoKhoa> = [
    {
      title: '#',
      key: 'stt',
      width: 50,
      render: (_: unknown, __: DongHachToanCoKhoa, index: number) => index + 1,
    },
    {
      title: 'Diễn giải',
      dataIndex: 'dienGiai',
      key: 'dienGiai',
      render: (v: string, record: DongHachToanCoKhoa) => (
        <Input
          value={v}
          onChange={(e) => patchDong(record.khoa, { dienGiai: e.target.value })}
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
      render: (v: number, record: DongHachToanCoKhoa) => (
        <InputNumber
          style={{ width: '100%' }}
          value={v}
          min={0}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/,/g, ''))}
          onChange={(val) => patchDong(record.khoa, { soTien: Number(val) || 0 })}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: DongHachToanCoKhoa) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeDong(record.khoa)}
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
                <div><Text>Loại giao dịch</Text></div>
                <Select
                  style={{ width: '100%' }}
                  value={loaiGiaoDichMa}
                  onChange={setLoaiGiaoDichMa}
                  placeholder="Chọn loại giao dịch cho bút toán kết chuyển"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={loaiGiaoDich.map((l) => ({
                    value: l.ma,
                    label: `${l.ma} — ${l.ten}`,
                  }))}
                  notFoundContent={
                    <Link to="/danh-muc/loai-giao-dich">Chưa có loại giao dịch nào — mở danh mục</Link>
                  }
                />
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
                  onChange={(d) => {
                    if (!d) return;
                    setNgayHachToan(d);
                    setDaSuaNgayHachToan(true);
                  }}
                />
              </div>
              <div>
                <div><Text>Ngày chứng từ</Text></div>
                <DatePicker
                  style={{ width: '100%' }}
                  value={ngayChungTu}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  onChange={(d) => {
                    if (!d) return;
                    setNgayChungTu(d);
                    setDaSuaNgayChungTu(true);
                  }}
                />
              </div>
              <div>
                <div><Text>Số chứng từ</Text></div>
                <Input disabled placeholder={goiYSoChungTu} />
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
        <Table<DongHachToanCoKhoa>
          rowKey="khoa"
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
