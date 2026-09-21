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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Khóa sổ</h1>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => handler.setState('showCauHinhDialog', true)}
          >
            Thiết lập tự động
          </Button>
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={() => handler.setState('showKhoaSoDialog', true)}
          >
            Khóa sổ
          </Button>
        </Space>
      </div>

      <KhoaSoList />
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
