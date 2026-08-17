import { useRef, type ReactNode } from 'react';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  EyeOutlined,
  DownOutlined,
  DollarOutlined,
  FileDoneOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { TheoDoiHopDongRow } from '@/types';
import ThuTienDonHangModal from './ThuTienDonHangModal';
import ButToanDonHangModal from './ButToanDonHangModal';
import { tinhGhiChuDonHang, type HanhDongDonHang, type SoLieuGhiChu } from './ghiChuDonHang';
import { TK_CHUA_THUC_HIEN, TK_DOANH_THU } from './ghiNhanDoanhThu';

/** Phải thu khách hàng — TK Nợ khi ghi nhận doanh thu chưa thực hiện. */
const TK_PHAI_THU = '131';

/** Icon của từng việc cần làm — dùng chung cho nút chính lẫn mục trong menu. */
const ICON_HANH_DONG: Record<HanhDongDonHang, ReactNode> = {
  THU_TIEN: <DollarOutlined />,
  GHI_NHAN_DOANH_THU: <FileDoneOutlined />,
  KET_CHUYEN_DOANH_THU: <SwapOutlined />,
};

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
 * Ô cuối mỗi dòng đơn hàng: nút lệnh CHÍNH là việc cần làm gần nhất (Thu tiền / Ghi
 * nhận doanh thu / Kết chuyển doanh thu), mũi tên bên cạnh mở "Xem" và các việc
 * còn lại. Hết việc thì chỉ còn nút "Xem". Tình trạng đọc ở các cột số, không
 * lặp lại thành nhãn.
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

  // Việc cần làm gần nhất lên nút chính; phần còn lại + "Xem" nằm trong menu.
  const chinh = viecCanLam[0];
  const conLai = viecCanLam.slice(1);

  const items: MenuProps['items'] = [
    { key: 'xem', icon: <EyeOutlined />, label: 'Xem', onClick: onTheoDoi },
    ...(conLai.length ? [{ type: 'divider' as const }] : []),
    ...conLai.map((c) => ({
      key: c.hanhDong,
      icon: ICON_HANH_DONG[c.hanhDong],
      label: c.nhan,
      onClick: () => moModal.current[c.hanhDong]?.(),
    })),
  ];

  return (
    <div className="flex items-center justify-center">
      {chinh ? (
        <Dropdown.Button
          size="small"
          type="link"
          trigger={['click']}
          placement="bottomRight"
          className="row-action-menu"
          icon={<DownOutlined />}
          menu={{ items }}
          onClick={() => moModal.current[chinh.hanhDong]?.()}
        >
          {ICON_HANH_DONG[chinh.hanhDong]} {chinh.nhan}
        </Dropdown.Button>
      ) : (
        // Hết việc phải làm → menu chỉ còn đúng "Xem", bày nguyên nút cho gọn.
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={onTheoDoi}>
          Xem
        </Button>
      )}

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
