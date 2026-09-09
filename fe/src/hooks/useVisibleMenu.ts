import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { keyMatches } from '@/config/modules';
import { useEffectiveMenuKeys } from './useEffectiveMenuKeys';
import {
  MENU_MODULES, leavesOfModule, permKeyOf, pathOf,
  type MenuLeaf, type MenuModule,
} from '@/config/menuCatalog';

export interface VisibleModule {
  module: MenuModule;
  leaves: MenuLeaf[];
}

/**
 * Hai tầng lọc, thứ tự cố định: lĩnh vực trước, quyền sau.
 * Mục `soon` bỏ qua tầng quyền — chưa có gì để cấp, ẩn đi thì người dùng
 * không bao giờ biết tính năng đang được làm.
 */
export function locMuc(
  leaves: MenuLeaf[],
  moduleKeys: string[],
  coQuyen: (perm: string) => boolean,
  isSuperAdmin: boolean,
): MenuLeaf[] {
  return leaves.filter((leaf) => {
    if (leaf.legacy) return false;
    if (isSuperAdmin) return true;
    if (!keyMatches(pathOf(leaf), moduleKeys)) return false;
    if (leaf.status === 'soon') return true;
    return coQuyen(`${permKeyOf(leaf)}:xem`);
  });
}

export function useVisibleMenu(): VisibleModule[] {
  const { hasPermission, user } = useAuth();
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  return useMemo(
    () =>
      MENU_MODULES.map((module) => {
        // Mục gộp (Danh mục): mở khi có quyền xem ít nhất 1 route con.
        if (module.aggregateRoutes) {
          // Giữ đúng hành vi cũ của menuKeyVisible trong MainLayout:
          // mở khi có ÍT NHẤT 1 route con vừa thuộc lĩnh vực vừa có quyền xem.
          const mo =
            isSuperAdmin ||
            module.aggregateRoutes.some(
              (r) =>
                keyMatches(r, allEffectiveKeys) && hasPermission(`${r}:xem`),
            );
          return { module, leaves: mo ? leavesOfModule(module.id) : [] };
        }
        return {
          module,
          leaves: locMuc(
            leavesOfModule(module.id),
            allEffectiveKeys,
            hasPermission,
            isSuperAdmin,
          ),
        };
      }).filter((m) => m.leaves.length > 0),
    [allEffectiveKeys, hasPermission, isSuperAdmin],
  );
}
