import React, { useMemo } from 'react';
import { Empty } from 'antd';

import { DANH_MUC_GROUPS } from '@/config/danhMucCatalog';
import { keyMatches } from '@/config/modules';
import { useEffectiveMenuKeys } from '@/hooks/useEffectiveMenuKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/contexts/TermContext';
import { LuoiDanhMuc } from './LuoiDanhMuc';

/**
 * Trang Danh mục toàn màn hình — thay cho danh sách thả xuống ở sidebar.
 * Chỉ hiện danh mục thuộc lĩnh vực của công ty VÀ user có quyền xem.
 *
 * Trang này chỉ lọc rồi giao cho `LuoiDanhMuc` vẽ.
 */
const DanhMucIndexPage: React.FC = () => {
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const { hasPermission, user } = useAuth();
  const { t } = useTerm();

  const groups = useMemo(() => {
    const isSuperAdmin = !!user?.isSuperAdmin;
    return DANH_MUC_GROUPS.map((g) => ({
      ...g,
      links: g.links
        .filter(
          (l) =>
            keyMatches(l.path, allEffectiveKeys) &&
            (isSuperAdmin || hasPermission(`${l.path}:xem`)),
        )
        .map((l) => ({ ...l, label: l.termKey ? t(l.termKey) : l.label })),
    })).filter((g) => g.links.length > 0);
  }, [allEffectiveKeys, hasPermission, user?.isSuperAdmin, t]);

  // Đếm số mục THỰC SỰ hiện ra. Bản vẽ ghi cứng "26 danh mục", nhưng lọc theo
  // quyền và lĩnh vực nên nhiều công ty không thấy đủ 26 — ghi cứng là nói sai.
  const soMuc = groups.reduce((s, g) => s + g.links.length, 0);

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="text-xl font-bold tracking-[-0.4px] text-foreground">Danh mục</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {soMuc} danh mục dùng chung cho toàn bộ nghiệp vụ · chỉ cập nhật khi phát sinh
        </p>
      </div>

      {groups.length === 0 ? (
        <Empty description="Không có danh mục nào khả dụng" />
      ) : (
        <LuoiDanhMuc nhom={groups} />
      )}
    </div>
  );
};

export default DanhMucIndexPage;
