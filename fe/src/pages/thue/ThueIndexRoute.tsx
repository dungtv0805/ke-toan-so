import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoutePermission } from "@/config/routePermissions";
import { THUE_NAV } from "@/config/sectionNavs";

/**
 * Sidebar chỉ còn một mục "Thuế" trỏ vào /thue — trang này quyết định đi đâu.
 * Chọn trang ĐẦU TIÊN user có quyền xem, không cứng nhắc trang đầu danh sách:
 * ai không có quyền xem Bảng kê mua vào mà bấm "Thuế" thì ăn ngay màn 403 dù
 * họ vẫn xem được 3 trang thuế còn lại.
 */
const ThueIndexRoute: React.FC = () => {
  const { hasPermission, user } = useAuth();

  const dich =
    THUE_NAV.find((it) => {
      if (user?.isSuperAdmin) return true;
      const quyen = getRoutePermission(it.path);
      return quyen ? hasPermission(quyen) : true;
    })?.path ?? THUE_NAV[0].path;

  return <Navigate to={dich} replace />;
};

export default ThueIndexRoute;
