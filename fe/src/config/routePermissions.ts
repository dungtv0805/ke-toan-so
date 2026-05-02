import { VaiTro } from '@/types';

// Define which roles can access each route
export const routePermissions: Record<string, VaiTro[]> = {
  // Dashboard - everyone can see
  '/': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  
  // Danh mục - Admin and accountants
  '/danh-muc': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/danh-muc/tai-khoan': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP'],
  '/danh-muc/doi-tuong': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP'],
  
  // Chứng từ - Role-specific
  '/chung-tu': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/chung-tu/phieu-thu': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'MANAGER'],
  '/chung-tu/phieu-chi': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'MANAGER'],
  '/chung-tu/nhat-ky-chung': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KIEM_SOAT'],
  
  // Trung tâm dữ liệu
  '/trung-tam-du-lieu': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/so-quy': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'MANAGER', 'KIEM_SOAT'],
  
  // Công nợ
  '/cong-no/phai-thu': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'MANAGER'],
  '/cong-no/phai-tra': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'MANAGER'],
  
  // Báo cáo
  '/bao-cao': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/bao-cao/pnl': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/bao-cao/so-cai': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KIEM_SOAT'],
  '/bao-cao/bang-can-doi': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],
  '/bao-cao/tai-chinh': ['ADMIN', 'GIAM_DOC', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'],

  // Danh mục - Quy chuẩn hạch toán
  '/danh-muc/quy-chuan': ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP'],

  // Cấu hình - Admin only
  '/cau-hinh/phan-quyen': ['ADMIN'],
  '/cau-hinh/vai-tro': ['ADMIN'],
  '/cau-hinh/thanh-vien': ['ADMIN'],
};

export const getRoutePermissions = (path: string): VaiTro[] | undefined => {
  // Exact match first
  if (routePermissions[path]) {
    return routePermissions[path];
  }
  
  // Try to find parent route match
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
