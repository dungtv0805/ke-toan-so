import React from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BankOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { formatCurrency } from './format';
import type { TienTheoTaiKhoanRow } from '../trialBalanceDerive';

interface Props {
  rows: TienTheoTaiKhoanRow[];
  loading?: boolean;
}

const columns: ColumnsType<TienTheoTaiKhoanRow> = [
  {
    title: 'Tài khoản',
    dataIndex: 'ma',
    // Dòng con (quỹ/ngân hàng) thụt vào cho dễ đọc — theo cờ `laCon`, không
    // đoán từ hình dạng mã (mã ngân hàng/quỹ là trường tự do).
    render: (ma: string, r) => (
      <span style={{ paddingLeft: r.laCon ? 20 : 0 }}>
        <b>{ma}</b> — {r.ten}
      </span>
    ),
  },
  { title: 'Số dư đầu kỳ', dataIndex: 'duDauKy', align: 'right', render: formatCurrency },
  { title: 'Phát sinh Nợ', dataIndex: 'phatSinhNo', align: 'right', render: formatCurrency },
  { title: 'Phát sinh Có', dataIndex: 'phatSinhCo', align: 'right', render: formatCurrency },
  { title: 'Số dư cuối kỳ', dataIndex: 'duCuoiKy', align: 'right', render: formatCurrency },
];

const TienTheoTaiKhoanTable: React.FC<Props> = ({ rows, loading }) => (
  <Card
    title={<span className="text-sm sm:text-base"><BankOutlined className="text-primary mr-2" />Số dư theo tài khoản / quỹ</span>}
    extra={<Link to="/so-quy" className="text-xs">Xem chi tiết</Link>}
  >
    <Table
      size="small"
      // Dòng con "chưa xác định đối tượng" được phát ra với `ma: ''` — hai TK
      // tiền cùng có phần chưa gán sẽ ra hai dòng trùng key nếu chỉ lấy mã.
      rowKey={(r, i) => `${i}-${r.ma}`}
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      scroll={{ x: 'max-content' }}
      summary={(data) => {
        // Chỉ cộng dòng cha để không đếm hai lần.
        const cha = data.filter((r) => !r.laCon);
        const tong = (f: keyof TienTheoTaiKhoanRow) =>
          cha.reduce((s, r) => s + (r[f] as number), 0);
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><b>Tổng cộng</b></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><b>{formatCurrency(tong('duDauKy'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><b>{formatCurrency(tong('phatSinhNo'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><b>{formatCurrency(tong('phatSinhCo'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><b>{formatCurrency(tong('duCuoiKy'))}</b></Table.Summary.Cell>
          </Table.Summary.Row>
        );
      }}
    />
  </Card>
);

export default TienTheoTaiKhoanTable;
