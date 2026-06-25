import { useAuth } from '@/contexts/AuthContext';

/**
 * True nếu user là super admin hoặc admin tenant.
 * Vai trò là chuỗi tự do (vai_tro.ten) — dữ liệu thực tế dùng tên "Admin",
 * nên so sánh KHÔNG phân biệt hoa-thường.
 * Dùng để gate các thao tác cấu hình chỉ dành cho quản trị (vd: Mẫu in).
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.isSuperAdmin === true || user?.vaiTro?.toUpperCase() === 'ADMIN';
}
