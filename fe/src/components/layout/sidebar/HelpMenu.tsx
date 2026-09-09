import React from 'react';
import {
  QuestionCircleOutlined, NodeIndexOutlined,
  SafetyCertificateOutlined, FormOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { keyMatches } from '@/config/modules';
import { useEffectiveMenuKeys } from '@/hooks/useEffectiveMenuKeys';

/**
 * Bốn trang thư viện (Quy trình / Chính sách / Biểu mẫu / Hướng dẫn).
 * Không chiếm ô phân hệ trên rail — rail dành cho 12 phân hệ nghiệp vụ; mục
 * Trợ giúp nằm riêng ở ĐÁY rail (xem `bienThe='rail'`).
 */
export const MUC_TRO_GIUP = [
  { key: '/quy-trinh', label: 'Quy trình', icon: <NodeIndexOutlined /> },
  { key: '/chinh-sach', label: 'Chính sách', icon: <SafetyCertificateOutlined /> },
  { key: '/bieu-mau', label: 'Biểu mẫu', icon: <FormOutlined /> },
  { key: '/huong-dan', label: 'Hướng dẫn', icon: <QuestionCircleOutlined /> },
];

/**
 * Lọc ĐÚNG hai tầng như `locMuc()` trong useVisibleMenu — lĩnh vực trước,
 * quyền sau, SuperAdmin bỏ qua cả hai. Bốn trang này đều là trang thật (không
 * có mục `soon`) nên không có ngoại lệ "chưa có gì để cấp" như ở sidebar.
 * Không lọc thì ai cũng thấy đủ 4 link rồi bấm vào bị ProtectedRoute chặn.
 *
 * Lưu ý: cả 4 key đang nằm trong COMMON_MENU_KEYS nên tầng lĩnh vực
 * (`keyMatches`) hiện luôn cho qua — đó là CHỦ Ý ("menu luôn hiển thị bất kể
 * lĩnh vực"). Vẫn gọi `keyMatches` chứ không bỏ: hôm nào một key rời khỏi
 * COMMON thì tầng lĩnh vực có hiệu lực ngay, không phải sửa lại chỗ này.
 */
export function locMucTroGiup(
  moduleKeys: string[],
  coQuyen: (perm: string) => boolean,
  isSuperAdmin: boolean,
): typeof MUC_TRO_GIUP {
  if (isSuperAdmin) return MUC_TRO_GIUP;
  return MUC_TRO_GIUP.filter(
    (m) => keyMatches(m.key, moduleKeys) && coQuyen(`${m.key}:xem`),
  );
}

/** panel = hàng dưới đáy ModulePanel · rail = ô chỉ-icon đáy rail · mobile = hàng cuối lớp 1 drawer. */
export type BienTheTroGiup = 'panel' | 'rail' | 'mobile';

const LOP: Record<BienTheTroGiup, string> = {
  panel:
    'flex h-[22px] w-full items-center gap-[6px] rounded-[6px] px-[7px] text-[11px]'
    + ' text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]',
  rail:
    'flex h-[40px] w-[50px] flex-col items-center justify-center rounded-[8px] transition-colors'
    + ' text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
  mobile:
    'flex h-[36px] w-full items-center gap-[8px] rounded-[7px] px-[8px] text-[12.5px]'
    + ' text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]',
};

interface Props {
  onSelect: (key: string) => void;
  /** Mặc định 'panel' — giữ nguyên chỗ cũ ở đáy ModulePanel. */
  bienThe?: BienTheTroGiup;
}

export const HelpMenu: React.FC<Props> = ({ onSelect, bienThe = 'panel' }) => {
  const { hasPermission, user } = useAuth();
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const muc = locMucTroGiup(
    allEffectiveKeys,
    hasPermission,
    user?.isSuperAdmin ?? false,
  );

  // Không còn mục nào xem được → ẩn hẳn nút, đừng mở ra một dropdown rỗng.
  if (muc.length === 0) return null;

  return (
    <Dropdown
      placement={bienThe === 'rail' ? 'topRight' : 'topLeft'}
      trigger={['click']}
      menu={{ items: muc, onClick: ({ key }) => onSelect(key) }}
    >
      <button
        type="button"
        aria-label="Trợ giúp & phản hồi"
        title="Trợ giúp & phản hồi"
        className={LOP[bienThe]}
      >
        <QuestionCircleOutlined className={bienThe === 'rail' ? 'text-[17px] leading-none' : 'text-[12px]'} />
        {/* Rail chỉ có icon — nhãn nằm ở aria-label/title, không chiếm 62px. */}
        {bienThe !== 'rail' && <span>Trợ giúp &amp; phản hồi</span>}
      </button>
    </Dropdown>
  );
};

export default HelpMenu;
