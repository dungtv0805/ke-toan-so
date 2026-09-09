import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleMenu } from '@/hooks/useVisibleMenu';
import type { ModuleId } from '@/config/menuCatalog';
import { SidebarRail } from './SidebarRail';
import { ModulePanel } from './ModulePanel';
import { ModuleFlyout } from './ModuleFlyout';
import { useSidebarState } from './useSidebarState';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const modules = useVisibleMenu();
  const { thuGon, datThuGon, moduleTheoUrl } = useSidebarState(user?.id);

  const moduleTheoTrang = moduleTheoUrl(pathname);
  const [moduleChon, datModuleChon] = useState<ModuleId | undefined>();
  const [flyout, datFlyout] = useState<ModuleId | undefined>();

  const dangMo = moduleChon ?? moduleTheoTrang ?? modules[0]?.module.id;
  const current = modules.find((m) => m.module.id === dangMo);
  const flyoutModule = modules.find((m) => m.module.id === flyout);

  const beRong = thuGon ? 62 : 258;
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${beRong}px`);
  }, [beRong]);

  const chonModule = (id: ModuleId) => {
    const m = modules.find((x) => x.module.id === id);
    if (!m) return;
    // Nhóm 1 mục (Tổng quan, Danh mục) → vào thẳng trang, không mở panel.
    if (m.module.route) {
      navigate(m.module.route);
      datModuleChon(id);
      return;
    }
    // Bấm lại icon đang chọn → đóng/mở panel.
    if (id === dangMo && !thuGon) datThuGon(true);
    else datThuGon(false);
    datModuleChon(id);
  };

  return (
    <aside
      className="relative flex h-screen shrink-0"
      style={{ width: beRong }}
    >
      <SidebarRail
        modules={modules}
        activeModule={dangMo}
        onPick={chonModule}
        onHover={thuGon ? datFlyout : undefined}
      />
      {!thuGon && current && (
        <ModulePanel
          current={current}
          allModules={modules}
          activePath={pathname}
          onSelect={navigate}
          onCollapse={() => datThuGon(true)}
        />
      )}
      {thuGon && flyoutModule && !flyoutModule.module.route && (
        <ModuleFlyout
          current={flyoutModule}
          activePath={pathname}
          onSelect={navigate}
          onClose={() => datFlyout(undefined)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
