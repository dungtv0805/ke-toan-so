import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { DownloadOutlined, ShareAltOutlined } from '@ant-design/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Nút "Cài đặt ứng dụng" nổi: Android/desktop gọi prompt; iOS hiện hướng dẫn thủ công. */
const InstallPWA: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [hidden, setHidden] = useState<boolean>(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden) return null;
  const ios = isIOS();
  // Chỉ hiện khi: có sẵn prompt (Android/desktop) HOẶC đang iOS (hướng dẫn thủ công).
  if (!deferred && !ios) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const res = await deferred.userChoice;
      if (res.outcome === 'accepted') setHidden(true);
      setDeferred(null);
    } else {
      setIosOpen(true);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={handleClick}
        style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1100, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}
      >
        Cài đặt ứng dụng
      </Button>

      <Modal
        title="Cài đặt lên màn hình chính (iPhone/iPad)"
        open={iosOpen}
        onCancel={() => setIosOpen(false)}
        footer={null}
      >
        <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
          <li>Mở trang bằng <b>Safari</b> (không cài được qua Chrome trên iOS).</li>
          <li>
            Bấm nút <b>Chia sẻ</b> <ShareAltOutlined /> (ô vuông có mũi tên ↑) ở thanh công cụ.
          </li>
          <li>Kéo xuống chọn <b>“Thêm vào MH chính” (Add to Home Screen)</b>.</li>
          <li>Bấm <b>Thêm</b> — icon Master CEO sẽ xuất hiện như một ứng dụng.</li>
        </ol>
      </Modal>
    </>
  );
};

export default InstallPWA;
