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
  // Lấy luôn moduleDangChon/chonModule từ hook — không tự khai useState
  // trùng (review Task 8, Important 1).
  const { thuGon, datThuGon, moduleTheoUrl, moduleDangChon, chonModule } =
    useSidebarState(user?.id, pathname);

  // URL đổi thì bỏ lựa chọn thủ công, để panel/rail bám theo trang đang xem.
  // Bấm icon rail của phân hệ nghiệp vụ KHÔNG đổi URL nên lựa chọn đó vẫn
  // sống; còn chọn một mục con trong panel hay tìm bằng Tìm nhanh (⌘K) thì
  // đổi URL — panel phải đi theo trang mới chứ không kẹt lại ở phân hệ cũ
  // (review Task 8, Critical 2). `chonModule` là setter của useState nên ổn
  // định qua các lần render, đưa vào mảng phụ thuộc an toàn.
  useEffect(() => {
    chonModule(undefined);
  }, [pathname, chonModule]);

  const moduleTheoTrang = moduleTheoUrl(pathname);
  const [flyout, datFlyout] = useState<ModuleId | undefined>();

  const dangMo = moduleDangChon ?? moduleTheoTrang ?? modules[0]?.module.id;
  const current = modules.find((m) => m.module.id === dangMo);
  const flyoutModule = modules.find((m) => m.module.id === flyout);

  // Panel chỉ render khi phân hệ đang mở KHÔNG có `route` riêng (Tổng quan,
  // Danh mục có trang riêng, không có danh sách mục con để hiện trong panel
  // — review Task 8, Critical 1). Không cần một cơ chế "phân hệ nghiệp vụ
  // gần nhất" riêng: khi `current` là phân hệ có route, `dangMo` cũng đã suy
  // thẳng từ URL mới ngay khi điều hướng xong (nhờ effect ở trên), nên panel
  // tự ẩn — đây là cách gọn nhất thoả cả hai đường: vào thẳng '/' lẫn bấm
  // rail Danh mục từ một phân hệ khác.
  const panelSeHien = !thuGon && !!current && !current.module.route;
  // Bề rộng phải khớp với việc panel có thật render hay không — nếu không
  // MainLayout sẽ chừa thừa 196px trống khi panel bị ẩn vì phân hệ có route.
  const beRong = panelSeHien ? 258 : 62;
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${beRong}px`);
  }, [beRong]);

  // Đổi tên khỏi `chonModule` để không trùng setter cùng tên lấy từ hook.
  const bamRail = (id: ModuleId) => {
    const m = modules.find((x) => x.module.id === id);
    if (!m) return;
    // Nhóm 1 mục (Tổng quan, Danh mục) → vào thẳng trang, không mở panel.
    // KHÔNG set lựa chọn thủ công ở đây — `current` đã tự suy đúng từ URL
    // mới, set thêm chỉ là dư thừa (và sẽ bị effect ở trên xoá ngay khi URL
    // đổi).
    if (m.module.route) {
      navigate(m.module.route);
      return;
    }
    // Bấm lại icon đang chọn → đóng/mở panel.
    if (id === dangMo && !thuGon) datThuGon(true);
    else datThuGon(false);
    chonModule(id);
  };

  return (
    <aside
      className="relative flex h-screen shrink-0"
      style={{ width: beRong }}
    >
      <SidebarRail
        modules={modules}
        activeModule={dangMo}
        onPick={bamRail}
        onHover={thuGon ? datFlyout : undefined}
      />
      {!thuGon && current && !current.module.route && (
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
