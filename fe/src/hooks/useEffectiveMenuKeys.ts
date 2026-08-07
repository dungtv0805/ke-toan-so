import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isCommonKey, unionMenuKeys } from '@/config/modules';
import { MENU_CATALOG } from '@/config/menuCatalog';
import type { LinhVuc } from '@/services/linhVucService';

export interface EffectiveMenuKeys {
  /** Lĩnh vực khả dụng của tenant, đã sắp theo order. */
  moduleDefs: LinhVuc[];
  /** Menu chưa gán cho lĩnh vực nào — coi như thuộc KE_TOAN. */
  unassignedKeys: string[];
  /** Hợp nhất menuKeys mọi lĩnh vực + phần chưa gán. */
  allEffectiveKeys: string[];
}

/**
 * Tập menu key mà tenant hiện tại được nhìn thấy (lọc theo LĨNH VỰC, chưa lọc theo quyền).
 * Dùng chung giữa sidebar (MainLayout) và trang Danh mục để hai nơi không lệch nhau.
 */
export function useEffectiveMenuKeys(): EffectiveMenuKeys {
  const { availableModules, allModules, getModule } = useAuth();

  return useMemo(() => {
    const moduleDefs = availableModules
      .map((code) => getModule(code))
      .filter((m): m is LinhVuc => !!m)
      .sort((a, b) => a.order - b.order);

    const isAssigned = (key: string): boolean =>
      allModules.some((m) =>
        m.menuKeys.some((k) => key === k || key.startsWith(k + '/')),
      );

    const unassignedKeys = availableModules.includes('KE_TOAN')
      ? MENU_CATALOG.map((e) => e.key).filter(
          (key) => !isCommonKey(key) && !isAssigned(key),
        )
      : [];

    return {
      moduleDefs,
      unassignedKeys,
      allEffectiveKeys: [...unionMenuKeys(moduleDefs), ...unassignedKeys],
    };
  }, [availableModules, allModules, getModule]);
}
