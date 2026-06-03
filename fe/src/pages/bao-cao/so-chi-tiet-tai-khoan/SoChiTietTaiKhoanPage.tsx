import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Button, Space, Select, DatePicker, Breadcrumb, Empty, Typography,
} from 'antd';
import { ReloadOutlined, HomeOutlined, AccountBookOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  soChiTietTaiKhoanService, SoChiTietReport,
} from '@/services/soChiTietTaiKhoanService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { doiTuongService } from '@/services/doiTuongService';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type Kind = 'opening' | 'entry' | 'cong' | 'cuoi';
interface DisplayRow {
  key: string;
  kind: Kind;
  ngay?: string;
  soPhieu?: string;
  ngayChungTu?: string;
  noiDung: string;
  tkDoiUng?: string;
  phatSinhNo?: number;
  phatSinhCo?: number;
  soDuNo?: number;
  soDuCo?: number;
}

const fmt = (v?: number) =>
  v && v !== 0
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(v)
    : '';

const SoChiTietTaiKhoanPage: React.FC = () => {
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string }[]>([]);
  const [maTaiKhoan, setMaTaiKhoan] = useState<string>();
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [report, setReport] = useState<SoChiTietReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [accs, dts] = await Promise.all([
        taiKhoanService.getAll(),
        doiTuongService.getAll(),
      ]);
      setAccountOptions(accs.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })));
      setDoiTuongOptions(dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })));
    })();
  }, []);

  const loadReport = async () => {
    if (!maTaiKhoan || !range) return;
    setLoading(true);
    try {
      const data = await soChiTietTaiKhoanService.getReport(
        maTaiKhoan,
        range[0].startOf('day').toDate(),
        range[1].endOf('day').toDate(),
        maDoiTuong,
      );
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const dataSource: DisplayRow[] = useMemo(() => {
    if (!report) return [];
    const rows: DisplayRow[] = [];
    rows.push({
      key: 'opening', kind: 'opening', noiDung: 'Số dư đầu kỳ',
      soDuNo: report.soDuDauKyNo, soDuCo: report.soDuDauKyCo,
    });
    report.rows.forEach((r, i) => {
      rows.push({
        key: `e${i}`, kind: 'entry',
        ngay: dayjs(r.ngay).format('DD/MM/YYYY'),
        soPhieu: r.soPhieu,
        ngayChungTu: dayjs(r.ngayChungTu).format('DD/MM/YYYY'),
        noiDung: r.noiDung, tkDoiUng: r.tkDoiUng,
        phatSinhNo: r.phatSinhNo, phatSinhCo: r.phatSinhCo,
        soDuNo: r.soDuNo, soDuCo: r.soDuCo,
      });
    });
    rows.push({
      key: 'cong', kind: 'cong', noiDung: 'Cộng số phát sinh',
      phatSinhNo: report.tongPhatSinhNo, phatSinhCo: report.tongPhatSinhCo,
    });
    rows.push({
      key: 'cuoi', kind: 'cuoi', noiDung: 'Số dư cuối kỳ',
      soDuNo: report.soDuCuoiKyNo, soDuCo: report.soDuCuoiKyCo,
    });
    return rows;
  }, [report]);

  const columns: ColumnsType<DisplayRow> = [
    { title: 'Ngày ghi sổ', dataIndex: 'ngay', width: 110 },
    {
      title: 'Chứng từ',
      children: [
        { title: 'Số hiệu', dataIndex: 'soPhieu', width: 110 },
        { title: 'Ngày tháng', dataIndex: 'ngayChungTu', width: 110 },
      ],
    },
    { title: 'Diễn giải', dataIndex: 'noiDung', ellipsis: true },
    { title: 'TK đối ứng', dataIndex: 'tkDoiUng', width: 110, align: 'center' },
    {
      title: 'Số phát sinh',
      children: [
        { title: 'Nợ', dataIndex: 'phatSinhNo', width: 140, align: 'right', render: fmt },
        { title: 'Có', dataIndex: 'phatSinhCo', width: 140, align: 'right', render: fmt },
      ],
    },
    {
      title: 'Số dư',
      children: [
        { title: 'Nợ', dataIndex: 'soDuNo', width: 140, align: 'right', render: fmt },
        { title: 'Có', dataIndex: 'soDuCo', width: 140, align: 'right', render: fmt },
      ],
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Báo cáo' },
          { title: 'Sổ chi tiết tài khoản' },
        ]}
      />
      <Card
        title={<Space><AccountBookOutlined /><span>Sổ chi tiết tài khoản</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={loadReport}>Xem báo cáo</Button>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            allowClear={false}
          />
          <Select
            showSearch placeholder="Chọn tài khoản (bắt buộc)"
            style={{ width: 320 }} options={accountOptions}
            value={maTaiKhoan} onChange={setMaTaiKhoan}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Select
            showSearch allowClear placeholder="Đối tượng (tùy chọn)"
            style={{ width: 320 }} options={doiTuongOptions}
            value={maDoiTuong} onChange={setMaDoiTuong}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Button type="primary" onClick={loadReport} disabled={!maTaiKhoan}>Xem</Button>
        </Space>

        {report ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
                SỔ CHI TIẾT TÀI KHOẢN
              </div>
              <div>Tài khoản: <Text strong>{report.taiKhoan.ma} - {report.taiKhoan.ten}</Text></div>
              {report.doiTuong && (
                <div>Đối tượng: <Text strong>{report.doiTuong.ma} - {report.doiTuong.ten}</Text></div>
              )}
              <div>Loại tiền: <Text strong>VNĐ</Text></div>
            </div>
            <Table
              columns={columns}
              dataSource={dataSource}
              loading={loading}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 1100 }}
              rowClassName={(r) => (r.kind === 'entry' ? '' : 'sct-summary-row')}
            />
          </>
        ) : (
          <Empty description="Chọn tài khoản và kỳ rồi bấm Xem" />
        )}
      </Card>
      <style>{`.sct-summary-row { background:#fafafa; font-weight:600; }`}</style>
    </div>
  );
};

export default SoChiTietTaiKhoanPage;
