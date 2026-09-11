import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisibleMenu } from '@/hooks/useVisibleMenu';
import type { ModuleId } from '@/config/menuCatalog';
import { SidebarRail } from './SidebarRail';
import { ModulePanel } from './ModulePanel';
import { ModuleFlyout } from './ModuleFlyout';
import { useSidebarState } from './useSidebarState';
import { TimNhanhFocusContext } from './SidebarSearch';
import { useManHinh } from '@/hooks/useManHinh';

/** Bề rộng sidebar — panel mở (rail + ModulePanel) và thu gọn (chỉ rail).
 *  Nguồn duy nhất; MainLayout dùng lại để đặt giá trị mặc định cho biến CSS
 *  --sidebar-w, tránh lệch nhau khi đổi bề rộng sau này. */
export const BE_RONG_MO = 258;
export const BE_RONG_THU_GON = 62;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const modules = useVisibleMenu();
  // Lấy luôn moduleDangChon/chonModule từ hook — không tự khai useState
  // trùng (review Task 8, Important 1).
  const { thuGon, datThuGon, moduleTheoUrl, moduleDangChon, chonModule } =
    useSidebarState(user?.id, pathname);

  // Máy tính bảng: rail luôn chỉ chiếm 62px, panel mở ĐÈ lên nội dung (không
  // đẩy) rồi tự đóng khi chọn mục / bấm ra ngoài / Esc. Trạng thái đè-lên này
  // KHÔNG lưu và KHÔNG đụng `thuGon` (lựa chọn đã lưu của màn máy tính).
  const deLen = useManHinh() === 'tablet';
  const [panelDeMo, datPanelDeMo] = useState(false);

  // URL đổi thì bỏ lựa chọn thủ công, để panel/rail bám theo trang đang xem.
  // Bấm icon rail của phân hệ nghiệp vụ KHÔNG đổi URL nên lựa chọn đó vẫn
  // sống; còn chọn một mục con trong panel hay tìm bằng Tìm nhanh (⌘K) thì
  // đổi URL — panel phải đi theo trang mới chứ không kẹt lại ở phân hệ cũ
  // (review Task 8, Critical 2). `chonModule` là setter của useState nên ổn
  // định qua các lần render, đưa vào mảng phụ thuộc an toàn.
  // `search` cũng tính: sáu mục Kế hoạch/Dự báo cùng pathname, khác `?tab=`.
  useEffect(() => {
    chonModule(undefined);
    datPanelDeMo(false);
  }, [pathname, search, chonModule]);

  useEffect(() => {
    if (!deLen || !panelDeMo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') datPanelDeMo(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deLen, panelDeMo]);

  const moduleTheoTrang = moduleTheoUrl(pathname, search);
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
  const panelSeHien = (deLen ? panelDeMo : !thuGon) && !!current && !current.module.route;
  // Bề rộng phải khớp với việc panel có thật render hay không — nếu không
  // MainLayout sẽ chừa thừa 196px trống khi panel bị ẩn vì phân hệ có route.
  // Panel đè-lên (máy tính bảng) không chiếm chỗ nên chỉ tính rail.
  const beRong = panelSeHien && !deLen ? BE_RONG_MO : BE_RONG_THU_GON;
  // useLayoutEffect (KHÔNG phải useEffect): MainLayout vẽ content bằng
  // var(--sidebar-w, 258px) NGAY LẦN VẼ ĐẦU — useEffect chạy sau khi trình
  // duyệt đã sơn khung hình đó, nên ai đang thu gọn sẽ thấy content nháy
  // trượt 196px mỗi lần tải lại (rõ hơn vì có transition). useLayoutEffect
  // chạy trước khi sơn nên giá trị đúng có ngay từ khung hình đầu tiên.
  // ĐỪNG đổi lại thành useEffect.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${beRong}px`);
  }, [beRong]);

  // ⌘K/Ctrl+K: bắt ở đây (Sidebar luôn mount, không như panel/SidebarSearch
  // có lúc bị ẩn hẳn). Nếu panel đang không hiện thì mở ra, và nếu phân hệ
  // đang chọn là phân hệ có `route` riêng (Tổng quan, Danh mục — không có gì
  // để hiện trong panel) thì chuyển sang phân hệ đầu tiên KHÔNG có route
  // trong danh sách đang hiện, để panel có nội dung mà mở. Sau đó luôn tăng
  // `focusTick` để ô tìm tự lấy con trỏ (qua Context, xem SidebarSearch).
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!panelSeHien) {
          if (deLen) datPanelDeMo(true);
          else datThuGon(false);
          if (current?.module.route) {
            const dauTien = modules.find((m) => !m.module.route);
            if (dauTien) chonModule(dauTien.module.id);
          }
        }
        setFocusTick((t) => t + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelSeHien, deLen, current, modules, datThuGon, chonModule]);

  // Đổi tên khỏi `chonModule` để không trùng setter cùng tên lấy từ hook.
  const bamRail = (id: ModuleId) => {
    const m = modules.find((x) => x.module.id === id);
    if (!m) return;
    // Nhóm 1 mục (Tổng quan, Danh mục) → vào thẳng trang, không mở panel.
    // Xoá lựa chọn thủ công NGAY, cùng lúc với navigate() — nếu chỉ trông
    // chờ effect [pathname] xoá sau khi URL đổi thì panel cũ (nếu đang ghim
    // một phân hệ khác) hiện sai đúng một khung hình trước khi effect kịp
    // chạy.
    if (m.module.route) {
      chonModule(undefined);
      navigate(m.module.route);
      return;
    }
    if (deLen) {
      setFocusTick(0);
      datPanelDeMo(!(id === dangMo && panelDeMo));
      chonModule(id);
      return;
    }
    // Bấm lại icon đang chọn → đóng/mở panel.
    if (id === dangMo && !thuGon) {
      datThuGon(true);
    } else {
      // Mở panel bằng chuột: SidebarSearch mount lại và effect [tick] của nó
      // chạy ngay với giá trị còn sót từ lần ⌘K trước (cờ chỉ tăng, không bao
      // giờ về 0) → ô tìm cướp con trỏ dù người dùng chỉ bấm icon rail. Đặt
      // lại về 0 TRƯỚC khi đổi phân hệ.
      setFocusTick(0);
      datThuGon(false);
    }
    chonModule(id);
  };

  return (
    <TimNhanhFocusContext.Provider value={focusTick}>
      <aside
        className="relative flex h-screen h-dvh shrink-0"
        style={{ width: beRong }}
      >
        <SidebarRail
          modules={modules}
          activeModule={dangMo}
          onPick={bamRail}
          onHover={thuGon && !deLen ? datFlyout : undefined}
        />
        {panelSeHien && current && !deLen && (
          <ModulePanel
            current={current}
            allModules={modules}
            activePath={pathname}
            activeSearch={search}
            onSelect={navigate}
            onCollapse={() => datThuGon(true)}
          />
        )}
        {panelSeHien && current && deLen && (
          <>
            {/* Lớp nền: bấm ra ngoài panel thì đóng. Nằm DƯỚI panel, phủ phần nội dung. */}
            <button
              type="button"
              aria-label="Đóng menu"
              onClick={() => datPanelDeMo(false)}
              className="fixed inset-0 z-[1] cursor-default bg-black/20"
              style={{ left: BE_RONG_THU_GON }}
            />
            <div className="absolute top-0 z-[2] flex h-full shadow-xl" style={{ left: BE_RONG_THU_GON }}>
              <ModulePanel
                current={current}
                allModules={modules}
                activePath={pathname}
                activeSearch={search}
                onSelect={(key) => {
                  datPanelDeMo(false);
                  navigate(key);
                }}
                onCollapse={() => datPanelDeMo(false)}
              />
            </div>
          </>
        )}
        {thuGon && !deLen && flyoutModule && !flyoutModule.module.route && (
          <ModuleFlyout
            current={flyoutModule}
            activePath={pathname}
            activeSearch={search}
            onSelect={navigate}
            onClose={() => datFlyout(undefined)}
          />
        )}
      </aside>
    </TimNhanhFocusContext.Provider>
  );
};

export default Sidebar;
