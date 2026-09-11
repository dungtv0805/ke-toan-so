import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoutePermission } from "@/config/routePermissions";

/** Thứ tự ưu tiên khi vào thẳng /thue — trùng thứ tự 4 trang thuế trên menu dọc. */
const TRANG_THUE = [
  "/thue/bang-ke-mua-vao",
  "/thue/bang-ke-ban-ra",
  "/thue/tong-hop",
  "/thue/bao-cao-tndn",
];

/**
 * Sidebar chỉ còn một mục "Thuế" trỏ vào /thue — trang này quyết định đi đâu.
 * Chọn trang ĐẦU TIÊN user có quyền xem, không cứng nhắc trang đầu danh sách:
 * ai không có quyền xem Bảng kê mua vào mà bấm "Thuế" thì ăn ngay màn 403 dù
 * họ vẫn xem được 3 trang thuế còn lại.
 */
const ThueIndexRoute: React.FC = () => {
  const { hasPermission, user } = useAuth();

  const dich =
    TRANG_THUE.find((path) => {
      if (user?.isSuperAdmin) return true;
      const quyen = getRoutePermission(path);
      return quyen ? hasPermission(quyen) : true;
    }) ?? TRANG_THUE[0];

  return <Navigate to={dich} replace />;
};

export default ThueIndexRoute;
