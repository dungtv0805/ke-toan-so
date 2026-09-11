import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useManHinh } from '@/hooks/useManHinh';
import { Dropdown, Button, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { BankOutlined, CheckOutlined, DownOutlined, SwapOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function TenantSwitcher() {
  const { currentTenant, availableTenants, switchTenant } = useAuth();
  const [switching, setSwitching] = useState(false);
  const catTen = useManHinh() !== 'desktop';

  // Don't show switcher if user has only 1 or no tenants
  if (availableTenants.length <= 1) {
    if (!currentTenant) return null;

    // Tên công ty dài (vd "CÔNG TY TNHH …") đứng nguyên một dòng làm header 48px
    // tràn ngang trên điện thoại/máy tính bảng → cắt "…" theo bề rộng màn, tên đủ
    // ở tooltip trình duyệt. Màn ≥1280px không giới hạn như cũ.
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BankOutlined />
        <Text
          className="!text-foreground max-xl:truncate max-xl:max-w-[240px] dt:max-w-[28vw]"
          title={catTen ? currentTenant.tenantName : undefined}
        >
          {currentTenant.tenantName}
        </Text>
      </div>
    );
  }

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.tenantId || switching) return;

    setSwitching(true);
    try {
      await switchTenant(tenantId);
    } catch {
      message.error('Không thể chuyển công ty. Vui lòng thử lại.');
      setSwitching(false);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      label: (
        <Text strong className="flex items-center gap-1">
          <SwapOutlined /> Chuyển công ty
        </Text>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...availableTenants.map((tenant) => ({
      key: tenant.tenantId,
      label: (
        <div className="flex items-center justify-between min-w-[160px]">
          <div className="flex flex-col">
            <span>{tenant.tenantName || tenant.tenantId}</span>
            <span className="text-xs text-gray-400">{tenant.role}</span>
          </div>
          {currentTenant?.tenantId === tenant.tenantId && (
            <CheckOutlined className="text-primary ml-2" />
          )}
        </div>
      ),
      onClick: () => handleSwitch(tenant.tenantId),
    })),
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
      disabled={switching}
    >
      <Button
        type="text"
        className="flex items-center gap-2 !text-foreground"
        aria-label={`Chuyển công ty (đang chọn ${currentTenant?.tenantName ?? ''})`}
      >
        <BankOutlined />
        {/* Dưới 640px chỉ còn icon; 640–1279px cắt "…" để header không tràn. */}
        <span className="hidden sm:inline max-xl:truncate max-xl:max-w-[240px] dt:max-w-[28vw]">
          {currentTenant?.tenantName}
        </span>
        {switching ? <LoadingOutlined className="text-xs" /> : <DownOutlined className="text-xs" />}
      </Button>
    </Dropdown>
  );
}
