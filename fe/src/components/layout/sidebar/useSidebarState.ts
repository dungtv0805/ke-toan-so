import { useCallback, useEffect, useState } from 'react';
import { MENU_LEAVES, pathOf, type ModuleId } from '@/config/menuCatalog';

export const KHOA_THU_GON = (userId?: string) =>
  `sidebar-thu-gon:${userId ?? 'khach'}`;

/** Phân hệ chứa một pathname. Khớp dài nhất trước để '/' không nuốt hết. */
export function moduleTheoPath(pathname: string): ModuleId | undefined {
  const theoDoDai = [...MENU_LEAVES].sort(
    (a, b) => pathOf(b).length - pathOf(a).length,
  );
  const khop = theoDoDai.find((l) => {
    const p = pathOf(l);
    return p === '/' ? pathname === '/' : pathname.startsWith(p);
  });
  return khop?.module;
}

export function useSidebarState(userId?: string) {
  const [thuGon, datThuGonState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KHOA_THU_GON(userId)) === 'true';
    } catch {
      return false;
    }
  });
  const [moduleDangChon, chonModule] = useState<ModuleId | undefined>();

  const datThuGon = useCallback(
    (v: boolean) => {
      datThuGonState(v);
      try {
        localStorage.setItem(KHOA_THU_GON(userId), String(v));
      } catch {
        /* private mode — bỏ qua, chỉ mất tiện ích ghi nhớ */
      }
    },
    [userId],
  );

  // ⌘\ hoặc Ctrl+\ để mở/đóng panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        datThuGonState((v) => {
          const moi = !v;
          try {
            localStorage.setItem(KHOA_THU_GON(userId), String(moi));
          } catch { /* bỏ qua */ }
          return moi;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId]);

  return { thuGon, datThuGon, moduleDangChon, chonModule, moduleTheoUrl: moduleTheoPath };
}
