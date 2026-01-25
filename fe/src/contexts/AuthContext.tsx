import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NguoiDung, VaiTro } from '@/types';
import { authService } from '@/services/authService';
import { setAuthToken, getAuthToken, clearAuthToken } from '@/services/base/service-base';
import { ApiError, ApiErrorType } from '@/config/api';

// Permission mapping by role
const quyenHanTheoVaiTro: Record<VaiTro, string[]> = {
  ADMIN: ['*'], // All permissions
  KE_TOAN_TONG_HOP: [
    'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
    'quan_ly_tai_khoan', 'quan_ly_danh_muc',
    'xem_phieu_thu', 'xem_phieu_chi',
    'xem_cong_no', 'xem_so_quy'
  ],
  KE_TOAN_QUY: [
    'xem_so_quy', 'tao_phieu_thu', 'tao_phieu_chi',
    'xem_phieu_thu', 'xem_phieu_chi', 'sua_phieu',
    'xem_danh_muc'
  ],
  KE_TOAN_CONG_NO: [
    'xem_cong_no', 'quan_ly_cong_no',
    'xem_phai_thu', 'xem_phai_tra',
    'xem_danh_muc', 'xem_doi_tuong'
  ],
  MANAGER: [
    'duyet_phieu', 'xem_bao_cao', 'xem_tong_quan',
    'xem_phieu_thu', 'xem_phieu_chi',
    'xem_cong_no', 'xem_so_quy', 'xem_so_cai'
  ],
  AUDITOR: [
    'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
    'xem_phieu_thu', 'xem_phieu_chi',
    'xem_cong_no', 'xem_so_quy', 'xem_danh_muc'
  ],
};

interface AuthContextType {
  user: NguoiDung | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (roles: VaiTro[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<NguoiDung | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch (error) {
          // Token invalid or expired
          clearAuthToken();
          console.error('Failed to restore session:', error);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for unauthorized events from ServiceBase
    const handleUnauthorized = () => {
      setUser(null);
      clearAuthToken();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.type) {
          case ApiErrorType.UNAUTHORIZED:
            return { success: false, error: 'Email hoặc mật khẩu không chính xác' };
          case ApiErrorType.FORBIDDEN:
            return { success: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin' };
          case ApiErrorType.NETWORK_ERROR:
            return { success: false, error: 'Không thể kết nối đến server. Vui lòng thử lại' };
          default:
            return { success: false, error: error.message || 'Đăng nhập thất bại' };
        }
      }
      return { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearAuthToken();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const hasRole = useCallback((roles: VaiTro[]) => {
    if (!user) return false;
    return roles.includes(user.vaiTro);
  }, [user]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    const permissions = quyenHanTheoVaiTro[user.vaiTro] || [];
    // Admin has all permissions
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
