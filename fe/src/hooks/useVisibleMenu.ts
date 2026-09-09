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
 * Các khoá quyền chấp nhận được cho một mục.
 * Mục Tổng quan có HAI khoá vì lịch sử: routePermissions ánh xạ '/' sang
 * '/tong-quan:xem', nên người dùng thật cầm khoá sau chứ không phải '/:xem'.
 * Bỏ OR này là cả công ty mất Bảng điều hành khỏi sidebar.
 */
export const cacKhoaQuyen = (leaf: MenuLeaf): string[] =>
  pathOf(leaf) === '/'
    ? ['/:xem', '/tong-quan:xem']
    : [`${permKeyOf(leaf)}:xem`];

/**
 * Mục gộp (Danh mục) mở khi lĩnh vực cho phép ÍT NHẤT 1 route con, VÀ user có
 * quyền xem ÍT NHẤT 1 route con — hai phép kiểm ĐỘC LẬP, không bắt cùng một
 * route thoả cả hai. Đây là bản sao nguyên vẹn của MainLayout.tsx:91 và :376.
 */
export const moPhanHeGop = (
  routes: string[],
  moduleKeys: string[],
  coQuyen: (perm: string) => boolean,
  isSuperAdmin: boolean,
): boolean =>
  isSuperAdmin ||
  (routes.some((r) => keyMatches(r, moduleKeys)) &&
    routes.some((r) => coQuyen(`${r}:xem`)));

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
    return cacKhoaQuyen(leaf).some(coQuyen);
  });
}

export function useVisibleMenu(): VisibleModule[] {
  const { hasPermission, user } = useAuth();
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  return useMemo(
    () =>
      MENU_MODULES.map((module) => {
        if (module.aggregateRoutes) {
          const mo = moPhanHeGop(
            module.aggregateRoutes,
            allEffectiveKeys,
            hasPermission,
            isSuperAdmin,
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
