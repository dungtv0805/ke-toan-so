import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, Tooltip } from 'antd';
import { AppstoreOutlined, LockOutlined } from '@ant-design/icons';
import { iconByName, type ModuleCode } from '@/config/modules';

/**
 * Màn "Chọn lĩnh vực" — hiển thị khi tenant có lĩnh vực để chọn/giới thiệu mà
 * chưa chọn. Liệt kê TẤT CẢ lĩnh vực active: được cấp → chọn được; chưa cấp →
 * disabled (giới thiệu sản phẩm). Chọn xong vào app chỉ thấy menu lĩnh vực đó.
 */
export function ModuleSelector() {
  const { availableModules, allModules, setSelectedModule, currentTenant, logout } = useAuth();

  const handleSelect = (code: ModuleCode) => {
    setSelectedModule(code);
  };

  // Tất cả lĩnh vực active, lĩnh vực được cấp xếp trước (theo order).
  const isOwned = (code: string) => availableModules.includes(code);
  const modules = allModules
    .filter((m) => m.isActive)
    .sort((a, b) => {
      const ao = isOwned(a.code) ? 0 : 1;
      const bo = isOwned(b.code) ? 0 : 1;
      return ao !== bo ? ao - bo : a.order - b.order;
    });

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
          {modules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AppstoreOutlined className="text-4xl mb-3 opacity-50" />
              <p>Công ty chưa được cấp lĩnh vực nào.</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modules.map((def) => {
                const owned = isOwned(def.code);
                const card = (
                  <button
                    key={def.code}
                    type="button"
                    disabled={!owned}
                    onClick={() => owned && handleSelect(def.code)}
                    className={[
                      'relative p-5 border rounded-lg text-left transition-all duration-200 flex flex-col items-center gap-3 w-full',
                      owned
                        ? 'border-gray-200 hover:border-primary hover:bg-primary/5 hover:ring-2 hover:ring-primary/20 cursor-pointer'
                        : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl text-white shrink-0"
                      style={{ backgroundColor: owned ? def.color : '#9ca3af' }}
                    >
                      {iconByName(def.icon)}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-base flex items-center justify-center gap-2">
                        {def.name}
                        {!owned && (
                          <Tag icon={<LockOutlined />} className="!m-0">Chưa kích hoạt</Tag>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{def.description}</div>
                    </div>
                  </button>
                );
                return owned ? (
                  card
                ) : (
                  <Tooltip key={def.code} title="Lĩnh vực chưa được cấp. Liên hệ quản trị để kích hoạt.">
                    {card}
                  </Tooltip>
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
