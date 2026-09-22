import { useEffect } from 'react';
import { Button, Space } from 'antd';
import { SettingOutlined, LockOutlined } from '@ant-design/icons';
import { KhoaSoHandlerProvider, useKhoaSoHandler } from './KhoaSoHandlerContext';
import { KhoaSoList } from './components/KhoaSoList';
import { ThietLapTuDongDialog } from './components/ThietLapTuDongDialog';
import { KhoaSoTheoLoaiDialog } from './components/KhoaSoTheoLoaiDialog';
import './components/KhoaSoPage.state';

function KhoaSoPageContent() {
  const handler = useKhoaSoHandler();

  useEffect(() => {
    handler.executeEvent('init');
  }, [handler]);

  return (
    <div className="space-y-3">
      <KhoaSoList
        onThietLapTuDong={() => handler.setState('showCauHinhDialog', true)}
        onKhoaSo={() => handler.setState('showKhoaSoDialog', true)}
      />
      <ThietLapTuDongDialog />
      <KhoaSoTheoLoaiDialog />
    </div>
  );
}

export default function KhoaSoPage() {
  return (
    <KhoaSoHandlerProvider>
      <KhoaSoPageContent />
    </KhoaSoHandlerProvider>
  );
}
