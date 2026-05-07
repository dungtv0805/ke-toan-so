import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NguoiDung, TenantInfo } from '@/types';
import { authService } from '@/services/authService';
import { setAuthToken, getAuthToken, clearAuthToken, setCurrentTenant, getCurrentTenant, clearCurrentTenant } from '@/services/base/service-base';
import { ApiError, ApiErrorType } from '@/config/api';


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
  switchTenant: (tenantId: string) => Promise<void>;
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
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

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

          // Set permissions from BE
          if (response.permissions) {
            setUserPermissions(response.permissions);
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

      // Save BE permissions if available
      if (response.permissions) {
        setUserPermissions(response.permissions);
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
      setUserPermissions([]);
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
      if (response.permissions) {
        setUserPermissions(response.permissions);
      }
    } catch (error) {
      console.error('Failed to select tenant:', error);
      throw error;
    }
  }, [tempToken]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      const response = await authService.switchTenant(tenantId);

      setUser(response.user);
      setCurrentTenant(response.tenant);
      setCurrentTenantState(response.tenant);
      if (response.permissions) {
        setUserPermissions(response.permissions);
      }

      // Update the role in availableTenants if needed
      setAvailableTenants((prev) =>
        prev.map((t) =>
          t.tenantId === response.tenant.tenantId
            ? { ...t, role: response.tenant.role }
            : t,
        ),
      );

      // Reload page to refresh all data for the new tenant
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.user);
      if (response.permissions) {
        setUserPermissions(response.permissions);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (!currentTenant) return false;
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  }, [user, currentTenant, userPermissions]);

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
        switchTenant,
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
