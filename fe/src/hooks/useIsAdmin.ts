import { useAuth } from '@/contexts/AuthContext';

/**
 * True nếu user là super admin hoặc admin tenant (vaiTro === 'ADMIN').
 * Dùng để gate các thao tác cấu hình chỉ dành cho quản trị (vd: Mẫu in).
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.isSuperAdmin === true || user?.vaiTro === 'ADMIN';
}
