import React, { useMemo, useState } from 'react';
import { Select, Space, Typography, Segmented, ConfigProvider, Button, Tooltip, message } from 'antd';
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import TongQuanTab from './tabs/TongQuanTab';
import DongTienTab from './tabs/DongTienTab';
import KqkdTab from './tabs/KqkdTab';
import CongNoTab from './tabs/CongNoTab';
import BanHangTab from './tabs/BanHangTab';
import DashboardSettingsModal, { ALL_BLOCK_KEYS } from './components/DashboardSettingsModal';
import { PERIOD_OPTIONS, resolvePeriod, type DashboardPeriod } from '@/components/shared/period';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { tenantService } from '@/services/tenantService';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Tổng quan', value: 'tong-quan' },
  { label: 'Dòng tiền', value: 'dong-tien' },
  { label: 'Kết quả kinh doanh', value: 'kqkd' },
  { label: 'Công nợ', value: 'cong-no' },
  { label: 'Bán hàng', value: 'ban-hang' },
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<DashboardPeriod>('namNay');
  const { year, startMonth, endMonth } = resolvePeriod(period, CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<string>('tong-quan');
  const isAdmin = useIsAdmin();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['dash-config'],
    queryFn: () => tenantService.getDashboardConfig(),
  });

  // config null/undefined = chưa cấu hình → hiện tất cả khối.
  // Lọc bỏ key lạ để cấu hình cũ còn 'tinhHinhThucHien' không gây lỗi.
  const visibleKeys = useMemo(
    () => (Array.isArray(config) ? config.filter((k) => ALL_BLOCK_KEYS.includes(k)) : ALL_BLOCK_KEYS),
    [config],
  );

  const handleSaveConfig = async (blocks: string[]) => {
    setSaving(true);
    try {
      await tenantService.updateDashboardConfig(blocks);
      await refetchConfig();
      message.success('Đã lưu cấu hình báo cáo');
      setSettingsOpen(false);
    } catch {
      message.error('Lưu cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  };

  const tabProps = { year, startMonth, endMonth };

  return (
    <div className="space-y-3">
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          padding: '10px 12px',
          background: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">Tổng quan báo cáo</Text>
        </div>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: 'hsl(var(--primary))',
                itemSelectedColor: '#fff',
                itemColor: 'hsl(var(--primary))',
                itemHoverColor: 'hsl(var(--primary))',
                trackBg: 'hsl(var(--primary) / 0.08)',
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="label"
          />
          {isAdmin && activeTab === 'tong-quan' && (
            <Tooltip title="Chọn báo cáo hiển thị">
              <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
            </Tooltip>
          )}
        </Space>
      </div>

      {activeTab === 'tong-quan' && <TongQuanTab {...tabProps} visibleKeys={visibleKeys} />}
      {activeTab === 'dong-tien' && <DongTienTab {...tabProps} />}
      {activeTab === 'kqkd' && <KqkdTab {...tabProps} />}
      {activeTab === 'cong-no' && <CongNoTab {...tabProps} />}
      {activeTab === 'ban-hang' && <BanHangTab {...tabProps} />}

      <DashboardSettingsModal
        open={settingsOpen}
        value={visibleKeys}
        saving={saving}
        onSave={handleSaveConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
