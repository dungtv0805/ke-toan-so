import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Select, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HomeOutlined, ExportOutlined, RiseOutlined } from '@ant-design/icons';
import {
  PERIOD_OPTIONS,
  periodDateRange,
  resolvePeriod,
  type DashboardPeriod,
} from '@/components/shared/period';
import {
  baoCaoReportService,
  emptyDoanhThuRow,
  type DoanhThuRow,
} from '@/services/baoCaoReportService';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildDoanhThuSheets } from './doanhThuExport';

const { Text, Title } = Typography;

const CURRENT_YEAR = new Date().getFullYear();

const fmtCur = (v?: number) =>
  !v ? '-' : new Intl.NumberFormat('vi-VN').format(Math.round(v));

export default function BaoCaoDoanhThuPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('namNay');
  const [rows, setRows] = useState<DoanhThuRow[]>([]);
  const [tong, setTong] = useState<DoanhThuRow>(emptyDoanhThuRow('TỔNG'));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => resolvePeriod(period, CURRENT_YEAR), [period]);
  const kyLabel = useMemo(
    () =>
      `${PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? ''} (${range.year})`,
    [period, range.year],
  );

  useEffect(() => {
    const { start, end } = periodDateRange(range);
    setLoading(true);
    baoCaoReportService
      .getDoanhThu(start, end)
      .then((res) => {
        setRows(res.rows);
        setTong(res.tong);
      })
      .catch(() => message.error('Không tải được báo cáo doanh thu'))
      .finally(() => setLoading(false));
  }, [range]);

  const handleExport = async () => {
    const sheets = buildDoanhThuSheets(rows, tong, range.startMonth, range.endMonth, kyLabel);
    if (sheets.length === 0) {
      message.warning('Không có dữ liệu để xuất');
      return;
    }
    setExporting(true);
    try {
      await exportReportExcel('Bao cao doanh thu', sheets);
      message.success('Đã xuất Excel');
    } catch (e) {
      console.error('export excel error', e);
      message.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  // Chỉ hiện các tháng thuộc kỳ đang lọc — chọn Quý 1 thì bảng có đúng 3 cột tháng.
  const monthColumns: ColumnsType<DoanhThuRow> = useMemo(() => {
    const cols: ColumnsType<DoanhThuRow> = [];
    for (let m = range.startMonth; m <= range.endMonth; m += 1) {
      cols.push({
        title: `Tháng ${m}`,
        key: `t${m}`,
        width: 130,
        align: 'right',
        render: (_: unknown, r: DoanhThuRow) => fmtCur(r.thang[m - 1]),
      });
    }
    return cols;
  }, [range.startMonth, range.endMonth]);

  const columns: ColumnsType<DoanhThuRow> = [
    {
      title: 'Mã ĐH',
      dataIndex: 'soHopDong',
      key: 'soHopDong',
      width: 110,
      fixed: 'left',
      render: (v: string, r) => v || <Text type="secondary">{r.tenDonHang}</Text>,
    },
    { title: 'Khách hàng', dataIndex: 'khachHang', key: 'khachHang', width: 260, ellipsis: true },
    { title: 'Sản phẩm', dataIndex: 'sanPham', key: 'sanPham', width: 200, ellipsis: true },
    {
      title: 'Doanh số',
      dataIndex: 'doanhSo',
      key: 'doanhSo',
      width: 140,
      align: 'right',
      render: (v: number) => fmtCur(v),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'doanhThu',
      key: 'doanhThu',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong>{fmtCur(v)}</Text>,
    },
    ...monthColumns,
  ];

  return (
    <div className="p-4">
      <Breadcrumb
        className="mb-3"
        items={[{ title: <HomeOutlined /> }, { title: 'Báo cáo' }, { title: 'Báo cáo doanh thu' }]}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Title level={4} className="!mb-0">
          <RiseOutlined className="mr-2 text-blue-500" />
          Báo cáo doanh thu
        </Title>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="label"
          />
          <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>
            Xuất Excel
          </Button>
        </Space>
      </div>

      <Text type="secondary" className="text-xs">
        Doanh thu ghi nhận khi hạch toán Có TK 511 và có gắn đơn hàng — tính theo tháng
        của ngày chứng từ.
      </Text>

      <Card size="small" className="mt-2">
        <Table
          rowKey={(r) => r.soHopDong || r.tenDonHang}
          size="small"
          bordered
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Kỳ này chưa ghi nhận doanh thu' }}
          summary={() =>
            rows.length > 0 && (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-gray-50 font-semibold">
                  <Table.Summary.Cell index={0} colSpan={3}>
                    TỔNG
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    {fmtCur(tong.doanhSo)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {fmtCur(tong.doanhThu)}
                  </Table.Summary.Cell>
                  {monthColumns.map((_, i) => (
                    <Table.Summary.Cell key={i} index={5 + i} align="right">
                      {fmtCur(tong.thang[range.startMonth - 1 + i])}
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              </Table.Summary>
            )
          }
        />
      </Card>
    </div>
  );
}
