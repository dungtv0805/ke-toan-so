import React, { useState } from 'react';
import { Card, Table, Segmented, Button, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReconciliationOutlined, FileExcelOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { formatCurrency } from './format';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildDoiChieuSheets } from '../doiChieuExport';
import type { DoiChieuRow } from '../trialBalanceDerive';

interface Props {
  thu: DoiChieuRow[];
  tra: DoiChieuRow[];
  loading?: boolean;
  kyLabel: string;
}

const columns: ColumnsType<DoiChieuRow> = [
  { title: 'Đối tượng', dataIndex: 'doiTuong' },
  { title: 'Số dư đầu kỳ', dataIndex: 'duDauKy', align: 'right', render: formatCurrency },
  { title: 'Phát sinh tăng', dataIndex: 'phatSinhTang', align: 'right', render: formatCurrency },
  { title: 'Phát sinh giảm', dataIndex: 'phatSinhGiam', align: 'right', render: formatCurrency },
  { title: 'Số dư cuối kỳ', dataIndex: 'duCuoiKy', align: 'right', render: formatCurrency },
];

const DoiChieuCongNoTable: React.FC<Props> = ({ thu, tra, loading, kyLabel }) => {
  const [loai, setLoai] = useState<'thu' | 'tra'>('thu');
  const [exporting, setExporting] = useState(false);
  const rows = loai === 'thu' ? thu : tra;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReportExcel(
        `doi-chieu-cong-no-${loai}`,
        buildDoiChieuSheets(rows, loai, kyLabel),
      );
      message.success('Đã xuất Excel');
    } catch (e) {
      console.error('export excel error', e);
      message.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title={<span className="text-sm sm:text-base"><ReconciliationOutlined className="text-primary mr-2" />Đối chiếu công nợ</span>}
      extra={
        <Space>
          <Segmented
            size="small"
            value={loai}
            onChange={(v) => setLoai(v as 'thu' | 'tra')}
            options={[{ label: 'Phải thu', value: 'thu' }, { label: 'Phải trả', value: 'tra' }]}
          />
          <Button size="small" icon={<FileExcelOutlined />} onClick={handleExport} disabled={!rows.length} loading={exporting}>
            Xuất Excel
          </Button>
          <Link to="/bao-cao/bang-tong-hop" className="text-xs">Xem chi tiết</Link>
        </Space>
      }
    >
      <Table
        size="small"
        rowKey="doiTuong"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default DoiChieuCongNoTable;
