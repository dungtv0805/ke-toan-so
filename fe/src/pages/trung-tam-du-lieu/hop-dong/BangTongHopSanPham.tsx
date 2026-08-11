import { useState } from 'react';
import { Card, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HangPivot, KetQuaPivot } from './pivotSanPham';

const { Text } = Typography;

const fmt = (v: number) => (v ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : '-');

const oTien = (v: number) => <Text className="text-xs">{fmt(v)}</Text>;

const columns: ColumnsType<HangPivot> = [
  {
    title: 'Sản phẩm',
    dataIndex: 'ten',
    key: 'ten',
    width: 200,
    fixed: 'left',
    ellipsis: true,
    render: (v: string) => (
      <Text strong className="text-xs">
        {v}
      </Text>
    ),
  },
  {
    title: 'Cả năm',
    dataIndex: 'caNam',
    key: 'caNam',
    width: 140,
    fixed: 'left',
    align: 'right',
    render: (v: number) => (
      <Text strong className="text-xs">
        {fmt(v)}
      </Text>
    ),
  },
  { title: '6T đầu', dataIndex: 'hk1', key: 'hk1', width: 130, align: 'right', render: oTien },
  { title: '6T cuối', dataIndex: 'hk2', key: 'hk2', width: 130, align: 'right', render: oTien },
  ...[0, 1, 2, 3].map((q) => ({
    title: `Q${q + 1}`,
    key: `q${q}`,
    width: 120,
    align: 'right' as const,
    render: (_: unknown, r: HangPivot) => oTien(r.quy[q]),
  })),
  ...Array.from({ length: 12 }, (_, m) => ({
    title: `T${m + 1}`,
    key: `t${m}`,
    width: 110,
    align: 'right' as const,
    render: (_: unknown, r: HangPivot) => oTien(r.thang[m]),
  })),
];

/** Hàng TỔNG ghim trên đầu — 20 ô, thứ tự phải khớp `columns`. */
const hangTong = (tong: HangPivot) => {
  const o = (i: number, v: number, align: 'left' | 'right' = 'right') => (
    <Table.Summary.Cell key={i} index={i} align={align}>
      <Text strong className="text-xs">
        {i === 0 ? 'TỔNG' : fmt(v)}
      </Text>
    </Table.Summary.Cell>
  );
  return (
    <Table.Summary fixed="top">
      <Table.Summary.Row>
        {o(0, 0, 'left')}
        {o(1, tong.caNam)}
        {o(2, tong.hk1)}
        {o(3, tong.hk2)}
        {tong.quy.map((v, i) => o(4 + i, v))}
        {tong.thang.map((v, i) => o(8 + i, v))}
      </Table.Summary.Row>
    </Table.Summary>
  );
};

const bang = (kq: KetQuaPivot) => (
  <Table<HangPivot>
    size="small"
    rowKey="key"
    columns={columns}
    dataSource={kq.hang}
    pagination={false}
    sticky
    scroll={{ x: 'max-content', y: 380 }}
    summary={() => hangTong(kq.tong)}
    locale={{ emptyText: 'Chưa có số liệu' }}
  />
);

interface Props {
  doanhSo: KetQuaPivot;
  doanhThu: KetQuaPivot;
  nam: number;
}

/**
 * Panel thu gọn được, đặt trên thanh công cụ: DOANH SỐ (giá trị hợp đồng theo tháng ký)
 * và DOANH THU (Có 511 theo tháng chứng từ), cùng cắt theo sản phẩm.
 *
 * Mặc định đóng để không đẩy bảng đơn hàng xuống quá sâu.
 */
export default function BangTongHopSanPham({ doanhSo, doanhThu, nam }: Props) {
  const [mo, setMo] = useState(false);
  const [tab, setTab] = useState('doanhSo');

  return (
    <Card
      size="small"
      className="shadow-sm"
      title={
        <span className="text-sm font-semibold">Tổng hợp theo sản phẩm — năm {nam}</span>
      }
      extra={<a onClick={() => setMo((v) => !v)}>{mo ? 'Thu gọn' : 'Mở rộng'}</a>}
      // Đóng thì không render bảng luôn, khỏi dựng 20 cột × N hàng cho một panel đang ẩn.
      styles={mo ? undefined : { body: { display: 'none' } }}
    >
      {mo && (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="small"
          items={[
            { key: 'doanhSo', label: 'DOANH SỐ', children: bang(doanhSo) },
            { key: 'doanhThu', label: 'DOANH THU', children: bang(doanhThu) },
          ]}
        />
      )}
    </Card>
  );
}
