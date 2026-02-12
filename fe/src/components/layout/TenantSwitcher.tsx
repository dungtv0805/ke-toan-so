import { useAuth } from '@/contexts/AuthContext';
import { Dropdown, Button, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { BankOutlined, CheckOutlined, DownOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function TenantSwitcher() {
  const { currentTenant, availableTenants, selectTenant } = useAuth();

  // Don't show switcher if user has only 1 or no tenants
  if (availableTenants.length <= 1) {
    if (!currentTenant) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BankOutlined />
        <Text className="!text-foreground">{currentTenant.tenantName}</Text>
      </div>
    );
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      label: <Text strong>Chuyển công ty</Text>,
      disabled: true,
    },
    { type: 'divider' },
    ...availableTenants.map((tenant) => ({
      key: tenant.tenantId,
      label: (
        <div className="flex items-center justify-between min-w-[160px]">
          <span>{tenant.tenantName || tenant.tenantId}</span>
          {currentTenant?.tenantId === tenant.tenantId && (
            <CheckOutlined className="text-primary ml-2" />
          )}
        </div>
      ),
      onClick: () => {
        if (tenant.tenantId !== currentTenant?.tenantId) {
          selectTenant(tenant.tenantId);
        }
      },
    })),
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button type="text" className="flex items-center gap-2 !text-foreground">
        <BankOutlined />
        <span className="hidden sm:inline">{currentTenant?.tenantName}</span>
        <DownOutlined className="text-xs" />
      </Button>
    </Dropdown>
  );
}
