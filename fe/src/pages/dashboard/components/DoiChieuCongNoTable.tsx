import React, { useState } from 'react';
import { Card, Table, Button, Space, message } from 'antd';
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

// Trần số dòng hiển thị. Danh sách cuộn hết trong khung, KHÔNG ngắt sang trang.
const GIOI_HAN_DONG = 100;

// Trên màn hình chỉ giữ SỐ CUỐI KỲ — đầu kỳ/phát sinh là việc của bảng tổng
// hợp công nợ, ở đây chỉ cần "ai còn nợ bao nhiêu tại ngày cuối kỳ".
// File Excel vẫn xuất đủ cột (xem doiChieuExport.ts) vì đó là biên bản gửi khách.
const columns: ColumnsType<DoiChieuRow> = [
  { title: 'Mã đối tượng', dataIndex: 'ma', width: 130 },
  { title: 'Đối tượng', dataIndex: 'doiTuong', ellipsis: true },
  { title: 'Số dư cuối kỳ', dataIndex: 'duCuoiKy', align: 'right', width: 140, render: formatCurrency },
];

interface BangProps {
  tieuDe: string;
  loai: 'thu' | 'tra';
  rows: DoiChieuRow[];
  loading?: boolean;
  kyLabel: string;
}

const BangMotBen: React.FC<BangProps> = ({ tieuDe, loai, rows, loading, kyLabel }) => {
  const [exporting, setExporting] = useState(false);
  // `rows` đã được doiChieuCongNo() sắp xếp số dư cuối kỳ lớn → nhỏ.
  const hienThi = rows.slice(0, GIOI_HAN_DONG);

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
      title={<span className="text-sm sm:text-base"><ReconciliationOutlined className="text-primary mr-2" />{tieuDe}</span>}
      extra={
        <Space>
          <Button size="small" icon={<FileExcelOutlined />} onClick={handleExport} disabled={!rows.length} loading={exporting}>
            Xuất Excel
          </Button>
          <Link to="/bao-cao/bang-tong-hop" className="text-xs">Xem chi tiết</Link>
        </Space>
      }
    >
      <Table
        size="small"
        // Khoá theo MÃ, không theo tên: hai đối tượng khác mã trùng tên là
        // chuyện xảy ra được, khoá theo tên là hai dòng dùng chung một key.
        rowKey="ma"
        columns={columns}
        dataSource={hienThi}
        loading={loading}
        pagination={false}
        scroll={{ y: 360 }}
      />
      {rows.length > GIOI_HAN_DONG && (
        // Cắt bớt mà không nói ra thì bảng đọc như đã liệt kê hết.
        <div className="mt-2 text-xs text-muted-foreground">
          Hiển thị {GIOI_HAN_DONG} đối tượng có số dư lớn nhất / tổng {rows.length}.
        </div>
      )}
    </Card>
  );
};

const DoiChieuCongNoTable: React.FC<Props> = ({ thu, tra, loading, kyLabel }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
    <BangMotBen tieuDe="Công nợ phải thu" loai="thu" rows={thu} loading={loading} kyLabel={kyLabel} />
    <BangMotBen tieuDe="Công nợ phải trả" loai="tra" rows={tra} loading={loading} kyLabel={kyLabel} />
  </div>
);

export default DoiChieuCongNoTable;
