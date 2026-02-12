import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NguoiDung, VaiTro, TenantInfo } from '@/types';
import { authService } from '@/services/authService';
import { setAuthToken, getAuthToken, clearAuthToken, setCurrentTenant, getCurrentTenant, clearCurrentTenant } from '@/services/base/service-base';
import { ApiError, ApiErrorType } from '@/config/api';

// Permission mapping by role
const quyenHanTheoVaiTro: Record<VaiTro, string[]> = {
  ADMIN: ['*'], // All permissions within tenant
  GIAM_DOC: ['*'], // Director has all permissions within tenant
  KE_TOAN_TRUONG: [
    'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
    'quan_ly_tai_khoan', 'quan_ly_danh_muc',
    'xem_phieu_thu', 'xem_phieu_chi',
    'xem_cong_no', 'xem_so_quy', 'duyet_phieu'
  ],
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
  KIEM_SOAT: [
    'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
    'xem_phieu_thu', 'xem_phieu_chi',
    'xem_cong_no', 'xem_so_quy', 'xem_danh_muc'
  ],
};

interface AuthContextType {
  user: NguoiDung | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsTenantSelection: boolean;
  availableTenants: TenantInfo[];
  currentTenant: TenantInfo | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  hasRole: (roles: VaiTro[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<NguoiDung | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableTenants, setAvailableTenants] = useState<TenantInfo[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<TenantInfo | null>(null);
  const [needsTenantSelection, setNeedsTenantSelection] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authService.getMe();
          setUser(response.user);

          // Set current tenant from response
          if (response.tenant) {
            setCurrentTenant(response.tenant);
            setCurrentTenantState(response.tenant);
            setNeedsTenantSelection(false);
          }

          // Set available tenants if provided
          if (response.availableTenants && response.availableTenants.length > 0) {
            setAvailableTenants(response.availableTenants);
          }
        } catch (error) {
          // Token invalid or expired
          clearAuthToken();
          clearCurrentTenant();
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

      // Handle tenant from login response
      if (response.accessToken && response.tenant) {
        // Single tenant - auto set (token already saved by authService.login)
        setCurrentTenant(response.tenant);
        setCurrentTenantState(response.tenant);
        setNeedsTenantSelection(false);
        setTempToken(null);
      } else if (response.tempToken && response.tenants && response.tenants.length > 0) {
        // Multiple tenants - need selection, save tempToken for later
        setTempToken(response.tempToken);
        setAvailableTenants(response.tenants);
        setNeedsTenantSelection(true);
      } else if (response.accessToken && !response.tenant) {
        // SUPER_ADMIN with no tenants - can proceed without tenant
        setNeedsTenantSelection(false);
        setTempToken(null);
      }

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
      setCurrentTenantState(null);
      setAvailableTenants([]);
      setNeedsTenantSelection(false);
      setTempToken(null);
      clearAuthToken();
      clearCurrentTenant();
    }
  }, []);

  const selectTenant = useCallback(async (tenantId: string) => {
    if (!tempToken) {
      console.error('No temp token available for tenant selection');
      return;
    }

    try {
      // Call API to exchange tempToken + tenantId for accessToken
      const response = await authService.selectTenant(tempToken, tenantId);

      // Update state with response
      setUser(response.user);
      setCurrentTenant(response.tenant);
      setCurrentTenantState(response.tenant);
      setNeedsTenantSelection(false);
      setTempToken(null);
      setAvailableTenants([]);
    } catch (error) {
      console.error('Failed to select tenant:', error);
      throw error;
    }
  }, [tempToken]);

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
    // Super admin has all roles
    if (user.isSuperAdmin) return true;
    if (!currentTenant) return false;
    return roles.includes(currentTenant.role as VaiTro);
  }, [user, currentTenant]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    // Super admin has all permissions
    if (user.isSuperAdmin) return true;
    if (!currentTenant) return false;
    const role = currentTenant.role as VaiTro;
    const permissions = quyenHanTheoVaiTro[role] || [];
    // Admin has all permissions
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }, [user, currentTenant]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        needsTenantSelection,
        availableTenants,
        currentTenant,
        login,
        logout,
        refreshUser,
        selectTenant,
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
