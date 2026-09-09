import { useCallback, useEffect, useState } from 'react';
import { MENU_LEAVES, pathOf, type ModuleId } from '@/config/menuCatalog';

export const KHOA_THU_GON = (userId?: string) =>
  `sidebar-thu-gon:${userId ?? 'khach'}`;

/** Ghi trạng thái thu gọn. Nuốt lỗi vì chế độ ẩn danh chặn lưu trữ — mất tiện
 *  ích nhớ thì chấp nhận được, vỡ sidebar thì không. */
const luuThuGon = (userId: string | undefined, v: boolean): void => {
  try {
    localStorage.setItem(KHOA_THU_GON(userId), String(v));
  } catch {
    /* bỏ qua */
  }
};

/** MENU_LEAVES đã sắp theo độ dài path giảm dần, tính một lần lúc nạp module —
 *  danh sách là hằng số, không cần sort lại mỗi lần gọi moduleTheoPath. */
const LEAVES_THEO_DO_DAI = [...MENU_LEAVES].sort(
  (a, b) => pathOf(b).length - pathOf(a).length,
);

/** Phân hệ chứa một pathname. Khớp dài nhất trước để '/' không nuốt hết. */
export function moduleTheoPath(pathname: string): ModuleId | undefined {
  const khop = LEAVES_THEO_DO_DAI.find((l) => {
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
      luuThuGon(userId, v);
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
          luuThuGon(userId, moi);
          return moi;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId]);

  return { thuGon, datThuGon, moduleDangChon, chonModule, moduleTheoUrl: moduleTheoPath };
}
