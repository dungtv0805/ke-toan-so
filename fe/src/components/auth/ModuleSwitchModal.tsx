import { Modal, Tag, Tooltip } from 'antd';
import { CheckCircleFilled, LockOutlined } from '@ant-design/icons';
import { iconByName, type ModuleCode } from '@/config/modules';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleSwitchModalProps {
  open: boolean;
  onClose: () => void;
  availableModules: ModuleCode[];
  selectedModule: ModuleCode | null;
  onSelect: (code: ModuleCode) => void;
}

/**
 * Modal đổi lĩnh vực — hiển thị TẤT CẢ lĩnh vực đang active.
 * Lĩnh vực công ty chưa được cấp → disable (chờ kích hoạt).
 */
export function ModuleSwitchModal({
  open,
  onClose,
  availableModules,
  selectedModule,
  onSelect,
}: ModuleSwitchModalProps) {
  const { allModules } = useAuth();
  return (
    <Modal
      title="Chọn lĩnh vực"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {allModules.filter((m) => m.isActive).map((def) => {
          const owned = availableModules.includes(def.code);
          const current = def.code === selectedModule;

          const card = (
            <button
              key={def.code}
              type="button"
              disabled={!owned || current}
              onClick={() => owned && !current && onSelect(def.code)}
              className={[
                'relative p-4 border rounded-lg text-left transition-all duration-200 flex items-center gap-3 w-full',
                current
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 cursor-default'
                  : owned
                    ? 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed',
              ].join(' ')}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white shrink-0"
                style={{ backgroundColor: owned ? def.color : '#9ca3af' }}
              >
                {iconByName(def.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {def.name}
                  {current && <Tag color="blue" className="!m-0">Đang dùng</Tag>}
                  {!owned && (
                    <Tag icon={<LockOutlined />} className="!m-0">Chưa kích hoạt</Tag>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {def.description}
                </div>
              </div>
              {current && <CheckCircleFilled className="text-primary text-lg shrink-0" />}
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
    </Modal>
  );
}
