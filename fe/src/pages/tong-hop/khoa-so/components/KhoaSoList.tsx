import { useMemo } from 'react';
import { Table, Button, Card, Empty, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, SettingOutlined, LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useManHinh } from '@/hooks/useManHinh';
import { useKhoaSoHandler, useKhoaSoState } from '../KhoaSoHandlerContext';
import { KhoaSo } from '@/services/khoaSoService';
import type { LoaiChungTuType } from '@/services/loaiChungTuService';

interface KhoaSoListProps {
  onThietLapTuDong: () => void;
  onKhoaSo: () => void;
}

export function KhoaSoList({ onThietLapTuDong, onKhoaSo }: KhoaSoListProps) {
  const handler = useKhoaSoHandler();
  const manHinh = useManHinh();
  const [list] = useKhoaSoState('list', []);
  const [loading] = useKhoaSoState('loading', false);
  const [loaiChungTuList] = useKhoaSoState('loaiChungTuList', [] as LoaiChungTuType[]);

  const loaiChungTuMap = useMemo(() => {
    const map = new Map<string, string>();
    loaiChungTuList.forEach((lct) => map.set(lct.ma, lct.ten));
    return map;
  }, [loaiChungTuList]);

  const columns: ColumnsType<KhoaSo> = [
    {
      title: 'Loại chứng từ',
      dataIndex: 'loaiChungTuMa',
      width: 160,
      render: (ma: string | undefined) => (ma ? loaiChungTuMap.get(ma) || ma : 'Tất cả'),
    },
    {
      title: 'Ngày khóa sổ',
      dataIndex: 'ngayKhoaSo',
      width: 140,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Người dùng bị khóa',
      dataIndex: 'nguoiDungBiKhoa',
      width: 160,
      render: (users: string[] | undefined) => (users ? `${users.length} người` : 'Tất cả'),
    },
    {
      title: 'Nguồn',
      dataIndex: 'nguon',
      width: 100,
      render: (nguon: string) => (
        <Tag color={nguon === 'TU_DONG' ? 'blue' : 'green'}>
          {nguon === 'TU_DONG' ? 'Tự động' : 'Thủ công'}
        </Tag>
      ),
    },
    {
      title: 'Diễn giải',
      dataIndex: 'dienGiai',
      ellipsis: true,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: KhoaSo) => (
        <Popconfirm
          title="Bỏ khóa sổ này?"
          okText="Bỏ khóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          onConfirm={() => handler.executeEvent('deleteKhoaSo', record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="Khóa sổ"
      extra={
        <Space>
          <Button icon={<SettingOutlined />} onClick={onThietLapTuDong}>
            Thiết lập tự động
          </Button>
          <Button type="primary" icon={<LockOutlined />} onClick={onKhoaSo}>
            Khóa sổ
          </Button>
        </Space>
      }
    >
      <Table<KhoaSo>
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={manHinh === 'desktop' ? undefined : { x: 1000 }}
        locale={{ emptyText: <Empty description="Chưa có bản ghi khóa sổ nào" /> }}
      />
    </Card>
  );
}
