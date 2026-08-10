import React, { useMemo } from 'react';
import { Card, Empty, Typography } from 'antd';

import { Link } from 'react-router-dom';
import { DANH_MUC_GROUPS } from '@/config/danhMucCatalog';
import { keyMatches } from '@/config/modules';
import { useEffectiveMenuKeys } from '@/hooks/useEffectiveMenuKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/contexts/TermContext';

const { Title } = Typography;

/**
 * Trang Danh mục toàn màn hình — thay cho danh sách thả xuống ở sidebar.
 * Chỉ hiện danh mục thuộc lĩnh vực của công ty VÀ user có quyền xem.
 */
const DanhMucIndexPage: React.FC = () => {
  const { allEffectiveKeys } = useEffectiveMenuKeys();
  const { hasPermission, user } = useAuth();
  const { t } = useTerm();

  const groups = useMemo(() => {
    const isSuperAdmin = !!user?.isSuperAdmin;
    return DANH_MUC_GROUPS.map((g) => ({
      ...g,
      links: g.links.filter(
        (l) =>
          keyMatches(l.path, allEffectiveKeys) &&
          (isSuperAdmin || hasPermission(`${l.path}:xem`)),
      ),
    })).filter((g) => g.links.length > 0);
  }, [allEffectiveKeys, hasPermission, user?.isSuperAdmin]);

  return (
    <div className="space-y-3">
      <Card className="shadow-sm">
        <Title level={4} className="!mb-5">Danh mục</Title>

        {groups.length === 0 ? (
          <Empty description="Không có danh mục nào khả dụng" />
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {g.title}
                </div>
                <ul className="space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.path}>
                      <Link
                        to={l.path}
                        className="text-sm text-primary hover:underline"
                      >
                        {l.termKey ? t(l.termKey) : l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DanhMucIndexPage;
