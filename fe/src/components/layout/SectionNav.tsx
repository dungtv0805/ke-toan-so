import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoutePermission } from "@/config/routePermissions";

export interface SectionNavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  /** Trang chưa có → vẫn hiện trên thanh ngang kèm chấm "sắp ra mắt". */
  comingSoon?: boolean;
}

interface Props {
  items: SectionNavItem[];
  className?: string;
}

/**
 * Thanh điều hướng ngang đặt ở đầu trang — thay cho việc nhét từng mục vào
 * danh sách thả xuống của sidebar (danh sách dài, khó tìm).
 * Ẩn mục mà user không có quyền xem; mục không khai báo quyền thì luôn hiện.
 */
export const SectionNav: React.FC<Props> = ({ items, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();

  const visible = items.filter((it) => {
    if (user?.isSuperAdmin) return true;
    const perm = getRoutePermission(it.path);
    return perm ? hasPermission(perm) : true;
  });

  if (visible.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto border-b border-border pb-1.5 ${className ?? ""}`}
    >
      {visible.map((it) => {
        const active =
          location.pathname === it.path ||
          location.pathname.startsWith(it.path + "/");
        return (
          <button
            key={it.path}
            type="button"
            onClick={() => navigate(it.path)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.comingSoon && <span className="coming-soon-dot" />}
          </button>
        );
      })}
    </div>
  );
};

export default SectionNav;
