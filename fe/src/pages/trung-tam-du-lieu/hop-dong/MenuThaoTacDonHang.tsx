import { useRef } from 'react';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { EyeOutlined, MoreOutlined } from '@ant-design/icons';
import type { TheoDoiHopDongRow } from '@/types';
import ThuTienDonHangModal from './ThuTienDonHangModal';
import ButToanDonHangModal from './ButToanDonHangModal';
import { tinhGhiChuDonHang, type HanhDongDonHang, type SoLieuGhiChu } from './ghiChuDonHang';
import { TK_CHUA_THUC_HIEN, TK_DOANH_THU } from './ghiNhanDoanhThu';

/** Phải thu khách hàng — TK Nợ khi ghi nhận doanh thu chưa thực hiện. */
const TK_PHAI_THU = '131';

interface Props {
  row: TheoDoiHopDongRow & SoLieuGhiChu;
  canEdit: boolean;
  /** Mở Drawer theo dõi hợp đồng. */
  onTheoDoi: () => void;
  /** Sau khi tạo bút toán — chỉ số kế toán đổi. */
  onButToan: () => void;
  /** Sau khi thu tiền — cả Sổ thu tiền lẫn chứng từ đều đổi. */
  onThuTien: () => void;
}

/**
 * Ô cuối mỗi dòng đơn hàng: chỉ một menu ⋯ gom "Theo dõi" và các việc còn phải làm
 * (thu tiền, ghi nhận / kết chuyển doanh thu) — thay cho cột "Ghi chú" và nút "Theo
 * dõi" tách rời trước đây. Tình trạng đọc ở các cột số, không lặp lại thành nhãn.
 *
 * Modal được vẽ NGOÀI overlay của Dropdown và chỉ đăng ký hàm mở qua `renderTrigger`:
 * đặt trong overlay thì menu đóng lại sẽ tháo luôn modal vừa bấm.
 */
export default function MenuThaoTacDonHang({
  row,
  canEdit,
  onTheoDoi,
  onButToan,
  onThuTien,
}: Props) {
  const moModal = useRef<Partial<Record<HanhDongDonHang, () => void>>>({});
  const { chips } = tinhGhiChuDonHang(row);
  const viecCanLam = canEdit ? chips : [];

  const dangKy = (hanhDong: HanhDongDonHang) => (open: () => void) => {
    moModal.current[hanhDong] = open;
    return null;
  };

  const items: MenuProps['items'] = [
    { key: 'theo-doi', icon: <EyeOutlined />, label: 'Theo dõi', onClick: onTheoDoi },
    ...(viecCanLam.length ? [{ type: 'divider' as const }] : []),
    ...viecCanLam.map((c) => ({
      key: c.hanhDong,
      label: c.nhan,
      onClick: () => moModal.current[c.hanhDong]?.(),
    })),
  ];

  return (
    <div className="flex items-center justify-center">
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Thao tác" />
      </Dropdown>

      {viecCanLam.map((c) => {
        if (c.hanhDong === 'THU_TIEN') {
          return (
            <ThuTienDonHangModal
              key={c.hanhDong}
              hopDong={row}
              soLanDaThu={0}
              onCreated={onThuTien}
              renderTrigger={dangKy(c.hanhDong)}
            />
          );
        }
        const ketChuyen = c.hanhDong === 'KET_CHUYEN_DOANH_THU';
        return (
          <ButToanDonHangModal
            key={c.hanhDong}
            hopDong={row}
            tkNoPrefix={ketChuyen ? TK_CHUA_THUC_HIEN : TK_PHAI_THU}
            tkCoPrefix={ketChuyen ? TK_DOANH_THU : TK_CHUA_THUC_HIEN}
            tieuDe={c.nhan}
            soTienMacDinh={c.soTien}
            dienGiaiMacDinh={`${c.nhan} ${row.soHopDong}`}
            onCreated={onButToan}
            renderTrigger={dangKy(c.hanhDong)}
          />
        );
      })}
    </div>
  );
}
