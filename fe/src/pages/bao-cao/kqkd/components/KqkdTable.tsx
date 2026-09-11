import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { KqkdChiTieu } from '@/services/kqkdService';
import type { ManHinh } from '@/config/manHinh';
import { useManHinh } from '@/hooks/useManHinh';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';

interface KqkdTableProps {
  data: KqkdChiTieu[];
  loading: boolean;
}

const formatNumber = (value: number): string => {
  if (value === 0) return '-';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('vi-VN').format(abs);
  return value < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (value === 0) return '-';
  const formatted = Math.abs(value).toFixed(1);
  return value < 0 ? `(${formatted}%)` : `${formatted}%`;
};

const numberCell = (v: number) => (
  <span style={{ color: v < 0 ? 'hsl(var(--red))' : undefined }}>{formatNumber(v)}</span>
);

const columns: ColumnsType<KqkdChiTieu> = [
  {
    title: 'STT',
    key: 'stt',
    width: 50,
    align: 'center',
    render: (_v, _r, index) => index + 1,
  },
  {
    title: 'Chỉ tiêu',
    dataIndex: 'ten',
    key: 'ten',
    width: 240,
    render: (ten: string, row) => (
      <span style={{ paddingLeft: row.isCalculated ? 16 : 32 }}>{ten}</span>
    ),
  },
  { title: 'Mã số', dataIndex: 'ma', key: 'ma', width: 70, align: 'center' },
  {
    title: 'Kỳ hiện tại',
    children: [
      { title: 'Số tiền', dataIndex: 'kyHienTai', align: 'right', width: 120, render: numberCell },
      { title: '% DT thuần', dataIndex: 'phanTramDTThuan', align: 'right', width: 90, render: formatPercent },
      { title: 'Tỷ trọng CP', dataIndex: 'tyTrongChiPhi', align: 'right', width: 90, render: formatPercent },
    ],
  },
  {
    title: 'Kỳ trước',
    children: [
      { title: 'Số tiền', dataIndex: 'kyTruoc', align: 'right', width: 120, render: numberCell },
      { title: '% DT thuần', dataIndex: 'phanTramDTThuanKyTruoc', align: 'right', width: 90, render: formatPercent },
      { title: 'Tỷ trọng CP', dataIndex: 'tyTrongChiPhiKyTruoc', align: 'right', width: 90, render: formatPercent },
    ],
  },
  {
    title: 'Biến động',
    children: [
      { title: 'Số tiền', dataIndex: 'bienDong', align: 'right', width: 120, render: numberCell },
      {
        title: '%',
        dataIndex: 'phanTramBienDong',
        align: 'right',
        width: 80,
        render: (v: number | null) => (
          <span style={{ color: v !== null && v < 0 ? 'hsl(var(--red))' : undefined }}>
            {formatPercent(v)}
          </span>
        ),
      },
    ],
  },
];

/**
 * Cột theo loại màn hình. Máy tính / máy tính bảng: đúng bộ cột gốc.
 *
 * Điện thoại: bảng rộng 1200px, vuốt ngang là mất tên chỉ tiêu → ghim cột "Chỉ
 * tiêu" (hẹp lại, cho xuống dòng). Bỏ cột STT: nó chỉ là số thứ tự dòng (danh
 * tính chỉ tiêu đã có "Mã số"), mà muốn ghim "Chỉ tiêu" thì cột đứng trước nó
 * cũng phải ghim — 50px STT ghim là phí chỗ trên màn 390px.
 */
export function cotKqkdTheoManHinh(manHinh: ManHinh): ColumnsType<KqkdChiTieu> {
  if (manHinh !== 'mobile') return columns;
  return columns
    .filter((c) => c.key !== 'stt')
    .map((c) =>
      c.key === 'ten' ? { ...c, fixed: 'left' as const, width: RONG_COT_GHIM_DIEN_THOAI } : c,
    );
}

export function KqkdTable({ data, loading }: KqkdTableProps) {
  const manHinh = useManHinh();
  return (
    <Table<KqkdChiTieu>
      className="excel-table"
      columns={cotKqkdTheoManHinh(manHinh)}
      dataSource={data}
      rowKey="ma"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      scroll={{ x: 1200 }}
      rowClassName={(row) =>
        row.isBold || row.isCalculated ? 'kqkd-row-bold' : ''
      }
      locale={{ emptyText: 'Không có dữ liệu' }}
    />
  );
}
