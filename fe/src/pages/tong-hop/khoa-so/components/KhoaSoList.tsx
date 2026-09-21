import { Table, Button, Popconfirm, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useKhoaSoHandler, useKhoaSoState } from '../KhoaSoHandlerContext';
import { KhoaSo } from '@/services/khoaSoService';
import dayjs from 'dayjs';

export function KhoaSoList() {
  const handler = useKhoaSoHandler();
  const [list] = useKhoaSoState('list', []);
  const [loading] = useKhoaSoState('loading', false);

  const columns = [
    {
      title: 'Loại chứng từ',
      dataIndex: 'loaiChungTuMa',
      render: (ma: string | undefined) => ma || 'Tất cả',
    },
    {
      title: 'Ngày khóa sổ',
      dataIndex: 'ngayKhoaSo',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Người dùng bị khóa',
      dataIndex: 'nguoiDungBiKhoa',
      render: (users: string[] | undefined) => (users ? `${users.length} người` : 'Tất cả'),
    },
    {
      title: 'Nguồn',
      dataIndex: 'nguon',
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
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: '',
      width: 60,
      render: (_: unknown, record: KhoaSo) => (
        <Popconfirm
          title="Bỏ khóa sổ này?"
          onConfirm={() => handler.executeEvent('deleteKhoaSo', record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={list}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 20 }}
    />
  );
}
