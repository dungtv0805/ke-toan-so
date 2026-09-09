import React, { useState } from 'react';
import { Drawer } from 'antd';
import { ArrowLeftOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVisibleMenu } from '@/hooks/useVisibleMenu';
import type { ModuleId } from '@/config/menuCatalog';
import { MenuItemList } from './MenuItemList';
import { HelpMenu } from './HelpMenu';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Drawer 2 lớp: phân hệ → mục con. Lớp 2 dùng chung MenuItemList với panel. */
export const MobileMenu: React.FC<Props> = ({ open, onClose }) => {
  const modules = useVisibleMenu();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [dangXem, datDangXem] = useState<ModuleId | undefined>();
  const current = modules.find((m) => m.module.id === dangXem);

  const dong = () => {
    datDangXem(undefined);
    onClose();
  };

  return (
    <Drawer
      placement="left"
      width={300}
      open={open}
      onClose={dong}
      title={current ? current.module.label : 'Menu'}
      styles={{ body: { padding: 8 } }}
    >
      {current ? (
        <>
          <button
            type="button"
            aria-label="Quay lại danh sách phân hệ"
            onClick={() => datDangXem(undefined)}
            className="mb-[8px] flex items-center gap-[6px] text-[11.5px] text-[hsl(var(--muted-foreground))]"
          >
            <ArrowLeftOutlined /> Tất cả phân hệ
          </button>
          <MenuItemList
            leaves={current.leaves}
            activePath={pathname}
            activeSearch={search}
            onSelect={(key) => {
              navigate(key);
              dong();
            }}
          />
        </>
      ) : (
        <div className="flex flex-col">
          {modules.map(({ module, leaves }) => (
            <button
              key={module.id}
              type="button"
              // Nhánh không có route mở ra danh sách con (lớp 2) — báo cho
              // trình đọc màn hình biết, nếu không chỉ nghe được "Kho, 9".
              aria-haspopup={module.route ? undefined : 'true'}
              onClick={() => {
                if (module.route) {
                  navigate(module.route);
                  dong();
                } else {
                  datDangXem(module.id);
                }
              }}
              className="flex h-[36px] items-center gap-[8px] rounded-[7px] px-[8px] text-[12.5px] hover:bg-[hsl(var(--muted))]"
            >
              <span className="text-[15px]">{module.icon}</span>
              <span className="flex-1 text-left">{module.label}</span>
              {!module.route && (
                <>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {leaves.length}
                  </span>
                  <RightOutlined className="text-[9px] text-[hsl(var(--muted-foreground))]" />
                </>
              )}
            </button>
          ))}
          {/* Panel không tồn tại trên điện thoại — 4 trang thư viện phải có
              lối vào ngay ở lớp 1, nếu không chỉ vào được bằng cách gõ URL. */}
          <HelpMenu
            bienThe="mobile"
            onSelect={(key) => {
              navigate(key);
              dong();
            }}
          />
        </div>
      )}
    </Drawer>
  );
};

export default MobileMenu;
