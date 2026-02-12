import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2 } from 'lucide-react';

export function TenantSelector() {
  const { availableTenants, selectTenant, user, isLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSelect = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);
    try {
      await selectTenant(selectedTenant);
      // Navigate after successful tenant selection
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Failed to select tenant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Chọn công ty</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Xin chào <span className="font-medium text-foreground">{user?.hoTen}</span>, vui lòng chọn công ty để tiếp tục
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {availableTenants.map((tenant) => (
              <div
                key={tenant.tenantId}
                onClick={() => setSelectedTenant(tenant.tenantId)}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedTenant === tenant.tenantId
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{tenant.tenantName}</div>
                    <div className="text-sm text-muted-foreground">
                      Vai trò: {tenant.role}
                    </div>
                  </div>
                  {selectedTenant === tenant.tenantId && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {availableTenants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Bạn chưa được gán vào công ty nào.</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
            </div>
          )}

          <Button
            onClick={handleSelect}
            disabled={!selectedTenant || isSubmitting}
            className="w-full mt-4"
            size="lg"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
