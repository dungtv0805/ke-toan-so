// Route permission mapping - maps routes to their required permission string
// Used by ProtectedRoute to check if user has access via hasPermission()
//
// SINH TỪ menuCatalog — không chép tay nữa. Thêm trang mới vào catalog là bảng
// này tự có. KHÔNG đổi một ký tự nào của khoá đang có: khoá mới = người dùng
// thật mất quyền sau khi deploy.
import { permissionKeys } from './menuCatalog';
import { DANH_MUC_ROUTES } from './danhMucCatalog';

/**
 * Trang cấu hình — vào từ nút bánh răng, không nằm trong menu chính nên catalog
 * không sinh, phải khai tay. Đúng 3 khoá đang có; '/cau-hinh/linh-vuc',
 * '/cau-hinh/tenant', '/cau-hinh/sao-chep-danh-muc' KHÔNG khai ở đây — chúng
 * chưa bao giờ là khoá quyền (App.tsx để các route đó không kèm
 * requiredPermission), thêm vào là dựng rào chắn mới cho người đang dùng được.
 */
const QUYEN_CAU_HINH: Record<string, string> = {
  '/cau-hinh/phan-quyen': '/cau-hinh/phan-quyen:xem',
  '/cau-hinh/vai-tro': '/cau-hinh/vai-tro:xem',
  '/cau-hinh/thanh-vien': '/cau-hinh/thanh-vien:xem',
};

/**
 * Ngoại lệ lịch sử duy nhất: route '/' đòi khoá '/tong-quan:xem' chứ không phải
 * '/:xem'. Người dùng thật đang cầm khoá '/tong-quan:xem'; đổi là cả công ty
 * mất Bảng điều hành (useVisibleMenu.cacKhoaQuyen chấp nhận cả hai vì lẽ đó).
 */
const QUYEN_KE_THUA: Record<string, string> = {
  '/': '/tong-quan:xem',
};

/** Mỗi route sinh đúng một khoá `<route>:xem`. */
function sinhTuCatalog(): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const key of [...permissionKeys(), ...DANH_MUC_ROUTES]) {
    ra[key] = `${key}:xem`;
  }
  return ra;
}

export const routePermissions: Record<string, string> = {
  ...sinhTuCatalog(),
  ...QUYEN_KE_THUA,
  ...QUYEN_CAU_HINH,
};

export const getRoutePermission = (path: string): string | undefined => {
  if (routePermissions[path]) {
    return routePermissions[path];
  }

  const pathParts = path.split('/').filter(Boolean);
  while (pathParts.length > 0) {
    const parentPath = '/' + pathParts.join('/');
    if (routePermissions[parentPath]) {
      return routePermissions[parentPath];
    }
    pathParts.pop();
  }

  return undefined;
};
