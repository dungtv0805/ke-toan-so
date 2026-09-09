import React from 'react';
import {
  QuestionCircleOutlined, NodeIndexOutlined,
  SafetyCertificateOutlined, FormOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';

/**
 * Bốn trang thư viện (Quy trình / Chính sách / Biểu mẫu / Hướng dẫn).
 * Không chiếm ô trên rail — rail dành cho 12 phân hệ nghiệp vụ.
 */
const MUC = [
  { key: '/quy-trinh', label: 'Quy trình', icon: <NodeIndexOutlined /> },
  { key: '/chinh-sach', label: 'Chính sách', icon: <SafetyCertificateOutlined /> },
  { key: '/bieu-mau', label: 'Biểu mẫu', icon: <FormOutlined /> },
  { key: '/huong-dan', label: 'Hướng dẫn', icon: <QuestionCircleOutlined /> },
];

export const HelpMenu: React.FC<{ onSelect: (key: string) => void }> = ({ onSelect }) => (
  <Dropdown
    placement="topLeft"
    trigger={['click']}
    menu={{ items: MUC, onClick: ({ key }) => onSelect(key) }}
  >
    <button
      type="button"
      className="flex h-[22px] w-full items-center gap-[6px] rounded-[6px] px-[7px] text-[11px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
    >
      <QuestionCircleOutlined className="text-[12px]" />
      <span>Trợ giúp &amp; phản hồi</span>
    </button>
  </Dropdown>
);

export default HelpMenu;
