import { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Divider, Typography, message } from 'antd';
import { TERM_REGISTRY } from '@/config/termRegistry';
import type { Glossary } from '@/types/tenant';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService } from '@/services/tenantService';
import { nganhService } from '@/services/nganhService';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

// Gộp glossary công ty hiện tại lên trên registry để hiện giá trị đang dùng.
function initialValue(g: Glossary | undefined) {
  const out: Record<string, { label: string; surfaces: Record<string, string> }> = {};
  for (const key of Object.keys(TERM_REGISTRY)) {
    const reg = TERM_REGISTRY[key];
    const cur = g?.[key];
    const surfaces: Record<string, string> = {};
    for (const s of Object.keys(reg.surfaces ?? {})) {
      surfaces[s] = cur?.surfaces?.[s] ?? reg.surfaces![s];
    }
    out[key] = { label: cur?.label ?? reg.label, surfaces };
  }
  return out;
}

export function GlossaryConfigModal({ open, onClose }: Props) {
  const { currentTenant, applyGlossary, user } = useAuth();
  const [value, setValue] = useState(() => initialValue(currentTenant?.glossary));
  const [saving, setSaving] = useState(false);
  const [savingStd, setSavingStd] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue(currentTenant?.glossary));
  }, [open, currentTenant?.glossary]);

  const buildGlossary = (): Glossary => {
    const g: Glossary = {};
    for (const key of Object.keys(value)) {
      const v = value[key];
      const surfaces: Record<string, string> = {};
      for (const s of Object.keys(v.surfaces)) {
        if (v.surfaces[s]?.trim()) surfaces[s] = v.surfaces[s].trim();
      }
      g[key] = Object.keys(surfaces).length ? { label: v.label, surfaces } : { label: v.label };
    }
    return g;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const g = buildGlossary();
      const res = await tenantService.updateGlossary(g);
      applyGlossary(res.glossary);
      message.success('Đã lưu nhãn hiển thị');
      onClose();
    } catch {
      message.error('Lưu nhãn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStandard = async () => {
    if (!currentTenant?.nganh) return;
    setSavingStd(true);
    try {
      const list = await nganhService.getAll();
      const nganh = list.find((n) => n.code === currentTenant.nganh);
      if (!nganh) {
        message.error('Không tìm thấy ngành để lưu chuẩn');
        return;
      }
      await nganhService.update(nganh.id, { glossary: buildGlossary() });
      message.success(`Đã lưu thành chuẩn ngành ${nganh.name}`);
    } catch {
      message.error('Lưu chuẩn ngành thất bại');
    } finally {
      setSavingStd(false);
    }
  };

  return (
    <Modal
      title="Cấu hình nhãn hiển thị"
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>Đóng</Button>,
        ...(user?.isSuperAdmin && currentTenant?.nganh
          ? [<Button key="std" loading={savingStd} onClick={handleSaveStandard}>Lưu thành chuẩn ngành</Button>]
          : []),
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>,
      ]}
    >
      <Form layout="vertical">
        {Object.keys(value).map((key) => (
          <div key={key}>
            <Form.Item label={`Nhãn: ${key}`} style={{ marginBottom: 8 }}>
              <Input
                value={value[key].label}
                onChange={(e) =>
                  setValue((p) => ({ ...p, [key]: { ...p[key], label: e.target.value } }))
                }
              />
            </Form.Item>
            {Object.keys(value[key].surfaces).map((s) => (
              <Form.Item key={s} label={<Text type="secondary">{`  ↳ ${s}`}</Text>} style={{ marginBottom: 8 }}>
                <Input
                  value={value[key].surfaces[s]}
                  onChange={(e) =>
                    setValue((p) => ({
                      ...p,
                      [key]: { ...p[key], surfaces: { ...p[key].surfaces, [s]: e.target.value } },
                    }))
                  }
                />
              </Form.Item>
            ))}
            <Divider style={{ margin: '8px 0' }} />
          </div>
        ))}
      </Form>
    </Modal>
  );
}
