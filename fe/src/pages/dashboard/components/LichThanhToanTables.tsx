import React from 'react';
import { Card, Table, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined } from '@ant-design/icons';
import { formatCurrency } from './format';
import type { LichThanhToanRow } from '../lichThanhToan';

const columns: ColumnsType<LichThanhToanRow> = [
  { title: 'Mốc đến hạn', dataIndex: 'nhan' },
  { title: 'Số khoản', dataIndex: 'soKhoan', align: 'right' },
  { title: 'Số tiền', dataIndex: 'soTien', align: 'right', render: formatCurrency },
];

const Bang: React.FC<{ title: string; rows: LichThanhToanRow[]; loading?: boolean }> = ({ title, rows, loading }) => (
  <Card title={<span className="text-sm sm:text-base"><CalendarOutlined className="text-primary mr-2" />{title}</span>}>
    <Table
      size="small"
      rowKey="nhan"
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      summary={(data) => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}><b>Tổng</b></Table.Summary.Cell>
          <Table.Summary.Cell index={1} align="right"><b>{data.reduce((s, r) => s + r.soKhoan, 0)}</b></Table.Summary.Cell>
          <Table.Summary.Cell index={2} align="right"><b>{formatCurrency(data.reduce((s, r) => s + r.soTien, 0))}</b></Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  </Card>
);

interface Props {
  thu: LichThanhToanRow[];
  tra: LichThanhToanRow[];
  loading?: boolean;
  /** Nhãn tiêu đề — tab Dòng tiền dùng "sắp đến hạn", tab Công nợ dùng "lịch thu/trả nợ". */
  tieuDeThu: string;
  tieuDeTra: string;
}

const LichThanhToanTables: React.FC<Props> = ({ thu, tra, loading, tieuDeThu, tieuDeTra }) => (
  <Row gutter={[12, 12]}>
    <Col xs={24} lg={12}><Bang title={tieuDeThu} rows={thu} loading={loading} /></Col>
    <Col xs={24} lg={12}><Bang title={tieuDeTra} rows={tra} loading={loading} /></Col>
  </Row>
);

export default LichThanhToanTables;
