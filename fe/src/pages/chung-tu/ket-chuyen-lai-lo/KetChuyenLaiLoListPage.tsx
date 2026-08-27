import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Empty,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { SectionNav } from '@/components/layout/SectionNav';
import { CHUNG_TU_NAV } from '@/config/sectionNavs';
import { usePagePermission } from '@/hooks/usePagePermission';
import { ketChuyenService, type LoKetChuyen } from '@/services/ketChuyenService';
import { nguoiDungService } from '@/services/nguoiDungService';
import { nhatKyChungService } from '@/services/nhatKyChungService';
import type { NhatKyChung } from '@/types';
import { dinhDangTien } from './ketChuyenTinhToan';
import { dungBanDoNguoiDung, tenNguoiTao } from './nguoiTaoHienThi';

const { Text } = Typography;

// Danh sách người dùng của một tenant chỉ vài chục bản ghi, nhưng API mặc định trả 10
// (`PaginationQueryDto.limit = 10`) nên phải xin đủ một lượt, không thì đa số chứng từ
// tra không ra tên.
const GIOI_HAN_NGUOI_DUNG = 500;

interface XemBanGhiState {
  open: boolean;
  soPhieu: string;
  loading: boolean;
  dong: NhatKyChung[];
}

const initXemBanGhi: XemBanGhiState = { open: false, soPhieu: '', loading: false, dong: [] };

const KetChuyenLaiLoListPage: React.FC = () => {
  const navigate = useNavigate();
  const { canCreate, canDelete } = usePagePermission('/chung-tu/ket-chuyen-lai-lo');
  const [lo, setLo] = useState<LoKetChuyen[]>([]);
  const [banDoNguoiDung, setBanDoNguoiDung] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [xem, setXem] = useState<XemBanGhiState>(initXemBanGhi);

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

  // Tra tên người tạo không được phép làm hỏng trang: lỗi ở đây chỉ khiến cột hiện lại id.
  const loadNguoiDung = async () => {
    try {
      const res = await nguoiDungService.getAll({ limit: GIOI_HAN_NGUOI_DUNG });
      setBanDoNguoiDung(dungBanDoNguoiDung(res.data));
    } catch {
      setBanDoNguoiDung(new Map());
    }
  };

  useEffect(() => { loadData(); loadNguoiDung(); }, []);

  const handleDelete = async (soPhieu: string) => {
    try {
      await ketChuyenService.remove(soPhieu);
      message.success('Đã xóa chứng từ kết chuyển');
      loadData();
    } catch (error) {
      message.error((error as Error)?.message || 'Xóa chứng từ kết chuyển thất bại');
    }
  };

  const handleXem = async (soPhieu: string) => {
    setXem({ open: true, soPhieu, loading: true, dong: [] });
    try {
      const dong = await nhatKyChungService.getBySoPhieu(soPhieu);
      setXem((prev) => ({ ...prev, dong, loading: false }));
    } catch (error) {
      message.error((error as Error)?.message || 'Không tải được các bút toán của chứng từ kết chuyển');
      setXem((prev) => ({ ...prev, loading: false }));
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
      title: 'Người tạo',
      dataIndex: 'nguoiTaoId',
      key: 'nguoiTaoId',
      width: 180,
      ellipsis: true,
      render: (id?: string) => {
        const ten = tenNguoiTao(id, banDoNguoiDung);
        return id ? <Tooltip title={id}>{ten}</Tooltip> : ten;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: LoKetChuyen) => (
        <Space size="small">
          <Tooltip title="Xem bút toán">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleXem(record.soPhieu)}
            />
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title="Xóa cả lô chứng từ kết chuyển này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.soPhieu)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const banGhiColumns: ColumnsType<NhatKyChung> = [
    { title: 'Diễn giải', dataIndex: 'dienGiai', key: 'dienGiai' },
    { title: 'TK Nợ', dataIndex: 'taiKhoanNo', key: 'taiKhoanNo', width: 90 },
    { title: 'TK Có', dataIndex: 'taiKhoanCo', key: 'taiKhoanCo', width: 90 },
    {
      title: 'Số tiền',
      dataIndex: 'soTien',
      key: 'soTien',
      width: 160,
      align: 'right' as const,
      render: (v: number) => dinhDangTien(v),
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

      <Modal
        title={`Bút toán chứng từ ${xem.soPhieu}`}
        open={xem.open}
        onCancel={() => setXem(initXemBanGhi)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Table<NhatKyChung>
          rowKey="id"
          size="small"
          loading={xem.loading}
          dataSource={xem.dong}
          columns={banGhiColumns}
          pagination={false}
          locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
          summary={(data) => (
            data.length > 0 ? (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Tổng cộng</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>
                      {dinhDangTien(data.reduce((t, d) => t + (Number(d.soTien) || 0), 0))}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          )}
        />
      </Modal>
    </div>
  );
};

export default KetChuyenLaiLoListPage;
