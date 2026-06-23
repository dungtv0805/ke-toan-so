import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppstoreOutlined } from '@ant-design/icons';
import { iconByName, type ModuleCode } from '@/config/modules';

/**
 * Màn "Chọn lĩnh vực" — hiển thị khi tenant có >1 lĩnh vực mà chưa chọn.
 * Chọn xong vào app chỉ thấy menu của lĩnh vực đó (đổi lại qua nút ở sidebar).
 */
export function ModuleSelector() {
  const { availableModules, setSelectedModule, currentTenant, logout, getModule } = useAuth();

  const handleSelect = (code: ModuleCode) => {
    setSelectedModule(code);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-[40rem] shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <AppstoreOutlined className="text-primary text-xl" />
          </div>
          <CardTitle className="text-xl">Chọn lĩnh vực</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{currentTenant?.tenantName}</span>
            {' '}— chọn lĩnh vực để tiếp tục
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {availableModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AppstoreOutlined className="text-4xl mb-3 opacity-50" />
              <p>Công ty chưa được cấp lĩnh vực nào.</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableModules.map((code) => {
                const def = getModule(code);
                if (!def) return null;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className="p-5 border rounded-lg text-left transition-all duration-200 border-gray-200 hover:border-primary hover:bg-primary/5 hover:ring-2 hover:ring-primary/20 flex flex-col items-center gap-3"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl text-white shrink-0"
                      style={{ backgroundColor: def.color }}
                    >
                      {iconByName(def.icon)}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-base">{def.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{def.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <Button variant="ghost" onClick={logout} className="w-full mt-5">
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
