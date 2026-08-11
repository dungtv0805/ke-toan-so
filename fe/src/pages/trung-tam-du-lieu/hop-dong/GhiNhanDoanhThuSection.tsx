import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Row, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { NhatKyChung, TheoDoiHopDongRow } from '@/types';
import { nhatKyChungService } from '@/services/nhatKyChungService';
import {
  TK_CHUA_THUC_HIEN,
  TK_DOANH_THU,
  tinhDoanhThuHopDong,
  tinhMacDinhGhiNhan,
} from './ghiNhanDoanhThu';
import ButToanDonHangModal from './ButToanDonHangModal';

const { Text } = Typography;

const fmtCur = (v?: number) =>
  !v ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(v));

interface Props {
  hopDong: TheoDoiHopDongRow;
  canEdit: boolean;
  /** Tổng tiền đã thu của đơn hàng (Sổ thu tiền) — dùng làm số mặc định khi ghi nhận. */
  daThanhToan: number;
}

/**
 * Khối "Ghi nhận doanh thu" trong Drawer đơn hàng: xem các lần đã ghi nhận và
 * sinh bút toán Nợ 3387 / Có 511 gắn sẵn đơn hàng.
 *
 * Chứng từ sinh ra là chứng từ Nhật ký chung bình thường (loai KHAC) — sửa/xóa ở
 * Nhật ký chung, không có bảng lưu riêng.
 */
export default function GhiNhanDoanhThuSection({ hopDong, canEdit, daThanhToan }: Props) {
  const [entries, setEntries] = useState<NhatKyChung[]>([]);
  const [loading, setLoading] = useState(false);

  const { ghiNhan, daGhiNhan, chuaGhiNhan } = useMemo(
    () => tinhDoanhThuHopDong(entries),
    [entries],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await nhatKyChungService.getByHopDong(hopDong.soHopDong));
    } catch {
      message.error('Không tải được các lần ghi nhận doanh thu');
    } finally {
      setLoading(false);
    }
  }, [hopDong.soHopDong]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: ColumnsType<NhatKyChung> = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 110,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    { title: 'Số chứng từ', dataIndex: 'soPhieu', key: 'soPhieu', width: 130 },
    {
      title: 'Số tiền',
      dataIndex: 'soTien',
      key: 'soTien',
      width: 150,
      align: 'right',
      render: (v: number) => fmtCur(v),
    },
    { title: 'Diễn giải', dataIndex: 'dienGiai', key: 'dienGiai', ellipsis: true },
  ];

  return (
    <>
      <Row gutter={12} align="middle" className="mb-2">
        <Col flex="auto">
          <Text type="secondary">Thực nhận: </Text>
          <Text strong>{fmtCur(daThanhToan)}</Text>
          <Text type="secondary"> · Đã ghi nhận: </Text>
          <Text strong type="success">{fmtCur(daGhiNhan)}</Text>
          <Text type="secondary"> · Chưa ghi nhận: </Text>
          <Text strong type="warning">{fmtCur(chuaGhiNhan)}</Text>
        </Col>
        {canEdit && (
          <Col>
            <ButToanDonHangModal
              hopDong={hopDong}
              tkNoPrefix={TK_CHUA_THUC_HIEN}
              tkCoPrefix={TK_DOANH_THU}
              tieuDe="Ghi nhận doanh thu"
              soTienMacDinh={tinhMacDinhGhiNhan(daThanhToan, daGhiNhan)}
              dienGiaiMacDinh={`Ghi nhận doanh thu ${hopDong.soHopDong}`}
              onCreated={load}
              renderTrigger={(open) => (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={open}>
                  Ghi nhận doanh thu
                </Button>
              )}
            />
          </Col>
        )}
      </Row>
      <Table
        size="small"
        rowKey={(r) => r.id || ''}
        loading={loading}
        columns={columns}
        dataSource={ghiNhan}
        pagination={false}
        locale={{ emptyText: 'Chưa ghi nhận doanh thu lần nào' }}
      />
    </>
  );
}
