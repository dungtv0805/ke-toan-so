import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { VaiTro } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: VaiTro[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spin size="large" tip="Đang kiểm tra đăng nhập..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.vaiTro)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle={`Vai trò "${user.vaiTro}" không được phép truy cập trang này.`}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Quay lại
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};
