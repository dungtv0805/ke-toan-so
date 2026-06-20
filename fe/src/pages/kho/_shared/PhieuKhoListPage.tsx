import { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Input,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import {
  HomeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { PhieuKho, LoaiPhieuKho } from '@/types';
import { phieuKhoService } from '@/services/phieuKhoService';
import { usePagePermission } from '@/hooks/usePagePermission';
import { formatCurrency } from '@/pages/chung-tu/phieu/lib/format';
import { PhieuKhoEditorModal } from './PhieuKhoEditorModal';
import { usePrintKhoPhieu } from './print/usePrintKhoPhieu';

const { RangePicker } = DatePicker;

interface Props {
  loaiPhieu: LoaiPhieuKho;
  tieuDe: string;
  route: string;
}

export function PhieuKhoListPage({ loaiPhieu, tieuDe, route }: Props) {
  const { canCreate, canEdit, canDelete } = usePagePermission(route);
  const printPhieu = usePrintKhoPhieu();

  const [data, setData] = useState<PhieuKho[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Filter state
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phieuKhoService.getPaginated({
        loaiPhieu,
        page,
        limit: pageSize,
        search: search || undefined,
        tuNgay: dateRange?.[0]?.format('YYYY-MM-DD'),
        denNgay: dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      setData(result.data);
      setTotal(result.meta?.total || 0);
    } catch {
      message.error('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [loaiPhieu, page, pageSize, search, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await phieuKhoService.remove(id);
      message.success('Đã xóa phiếu');
      loadData();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const handleSearch = () => {
    if (page === 1) {
      // Already on page 1; loadData deps (search, dateRange) are up-to-date via onChange,
      // so trigger one explicit fetch instead of relying on a stale effect.
      loadData();
    } else {
      // Resetting to page 1 will recreate loadData (page is a dep) and fire the effect.
      setPage(1);
    }
  };

  const columns: ColumnsType<PhieuKho> = [
    {
      title: 'Số phiếu',
      dataIndex: 'soPhieu',
      width: 130,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v || '—'}</span>,
    },
    {
      title: 'Ngày HT',
      dataIndex: 'ngayHachToan',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Đối tượng',
      dataIndex: 'doiTuongTen',
      width: 180,
      render: (v: string, record: PhieuKho) => {
        if (loaiPhieu === 'CHUYEN') {
          return `${record.khoXuatTen || record.khoXuatMa || ''} → ${record.khoNhapTen || record.khoNhapMa || ''}`;
        }
        return v || record.doiTuongMa || '—';
      },
    },
    {
      title: 'Diễn giải',
      dataIndex: 'dienGiai',
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'tongTien',
      width: 130,
      align: 'right',
      render: (v: number) => formatCurrency(v || 0),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_: unknown, record: PhieuKho) => (
        <Space size={4}>
          {canEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record.id)}
              title="Sửa"
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Xóa phiếu này?"
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Xóa"
              />
            </Popconfirm>
          )}
          <Button
            type="text"
            size="small"
            icon={<PrinterOutlined />}
            title="In phiếu"
            onClick={async () => {
              try {
                const full = await phieuKhoService.getById(record.id);
                printPhieu(full);
              } catch {
                message.error('Không tải được phiếu để in');
              }
            }}
          />
        </Space>
      ),
    },
  ];

  const groupLabel =
    loaiPhieu === 'NHAP' ? 'Nhập kho' : loaiPhieu === 'XUAT' ? 'Xuất kho' : 'Chuyển kho';

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Kho' },
          { title: tieuDe },
        ]}
      />

      <Card className="shadow-sm">
        {/* FilterBar */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          <Input
            placeholder="Tìm theo số phiếu, diễn giải..."
            prefix={<SearchOutlined />}
            style={{ width: 260, height: 28 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            size="small"
          />
          <RangePicker
            style={{ height: 28 }}
            size="small"
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            value={dateRange}
            onChange={(vals) =>
              setDateRange(
                vals
                  ? [vals[0] ?? null, vals[1] ?? null]
                  : null,
              )
            }
          />
          <Button
            size="small"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            style={{ height: 28 }}
          >
            Tìm
          </Button>
          <div style={{ marginLeft: 'auto' }}>
            {canCreate && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                style={{ height: 28 }}
                onClick={handleOpenCreate}
              >
                Lập {groupLabel.toLowerCase()}
              </Button>
            )}
          </div>
        </div>

        <Table<PhieuKho>
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} phiếu`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      <PhieuKhoEditorModal
        open={editorOpen}
        loaiPhieu={loaiPhieu}
        editingId={editingId}
        onClose={() => setEditorOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
