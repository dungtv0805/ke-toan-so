import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Popconfirm, Table, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { SectionNav } from '@/components/layout/SectionNav';
import { CHUNG_TU_NAV } from '@/config/sectionNavs';
import { usePagePermission } from '@/hooks/usePagePermission';
import { ketChuyenService, type LoKetChuyen } from '@/services/ketChuyenService';
import { dinhDangTien } from './ketChuyenTinhToan';

const { Text } = Typography;

const KetChuyenLaiLoListPage: React.FC = () => {
  const navigate = useNavigate();
  const { canCreate, canDelete } = usePagePermission('/chung-tu/ket-chuyen-lai-lo');
  const [lo, setLo] = useState<LoKetChuyen[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ketChuyenService.list();
      setLo(data);
    } catch {
      message.error('Không tải được danh sách kết chuyển lãi lỗ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (soPhieu: string) => {
    try {
      await ketChuyenService.remove(soPhieu);
      message.success('Đã xóa chứng từ kết chuyển');
      loadData();
    } catch (error) {
      message.error((error as Error)?.message || 'Xóa chứng từ kết chuyển thất bại');
    }
  };

  const columns: ColumnsType<LoKetChuyen> = [
    {
      title: 'Ngày hạch toán',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 140,
      render: (ngay: string) => dayjs(ngay).format('DD/MM/YYYY'),
    },
    { title: 'Số chứng từ', dataIndex: 'soPhieu', key: 'soPhieu', width: 160 },
    { title: 'Diễn giải', dataIndex: 'dienGiai', key: 'dienGiai', ellipsis: true },
    { title: 'Số dòng', dataIndex: 'soDong', key: 'soDong', width: 100, align: 'right' as const },
    {
      title: 'Tổng tiền kết chuyển',
      dataIndex: 'tongTien',
      key: 'tongTien',
      width: 180,
      align: 'right' as const,
      render: (v: number) => dinhDangTien(v),
    },
    {
      title: 'Lãi/Lỗ',
      dataIndex: 'laiLo',
      key: 'laiLo',
      width: 180,
      align: 'right' as const,
      render: (v: number) => (
        <Text type={v >= 0 ? 'success' : 'danger'}>
          {(v >= 0 ? 'Lãi ' : 'Lỗ ') + dinhDangTien(Math.abs(v))}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: LoKetChuyen) => (
        canDelete && (
          <Popconfirm
            title="Xóa cả lô chứng từ kết chuyển này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.soPhieu)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <SectionNav items={CHUNG_TU_NAV} />

      <Card
        title="Kết chuyển lãi lỗ"
        extra={
          canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/chung-tu/ket-chuyen-lai-lo/tao-moi')}
            >
              Thêm
            </Button>
          )
        }
      >
        <Table<LoKetChuyen>
          rowKey="soPhieu"
          loading={loading}
          dataSource={lo}
          columns={columns}
          locale={{ emptyText: <Empty description="Chưa có lần kết chuyển nào" /> }}
        />
      </Card>
    </div>
  );
};

export default KetChuyenLaiLoListPage;
