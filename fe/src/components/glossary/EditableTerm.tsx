import { useState } from 'react';
import { Popover, Input, Radio, Button, Space, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { applyGlossaryEdit, type EditScope } from '@/config/glossaryEdit';
import { tenantService } from '@/services/tenantService';

interface Props {
  tk: string;
  surface?: string;
}

export function EditableTerm({ tk, surface }: Props) {
  const { t } = useTerm();
  const { editMode } = useEditMode();
  const { currentTenant, applyGlossary } = useAuth();
  const label = t(tk, surface);

  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(label);
  const [scope, setScope] = useState<EditScope>(surface ? 'surface' : 'all');
  const [saving, setSaving] = useState(false);

  if (!editMode) return <>{label}</>;

  const onOpenChange = (o: boolean) => {
    if (o) {
      setVal(label);
      setScope(surface ? 'surface' : 'all');
    }
    setOpen(o);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = t(tk); // nhãn nền (không surface)
      const next = applyGlossaryEdit(currentTenant?.glossary, base, tk, val.trim(), scope, surface);
      const res = await tenantService.updateGlossary(next);
      applyGlossary(res.glossary);
      message.success('Đã lưu nhãn');
      setOpen(false);
    } catch {
      message.error('Lưu nhãn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Space direction="vertical" onClick={(e) => e.stopPropagation()}>
      <Input
        size="small"
        style={{ width: 220 }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={handleSave}
      />
      {surface && (
        <Radio.Group size="small" value={scope} onChange={(e) => setScope(e.target.value)}>
          <Radio value="all">Mọi nơi</Radio>
          <Radio value="surface">Chỉ chỗ này</Radio>
        </Radio.Group>
      )}
      <Button type="primary" size="small" loading={saving} onClick={handleSave}>
        Lưu
      </Button>
    </Space>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} trigger="click" title="Sửa nhãn" content={content}>
      <span
        style={{ cursor: 'pointer', borderBottom: '1px dashed #999' }}
        onClick={(e) => e.stopPropagation()}
      >
        {label} <EditOutlined style={{ fontSize: 10 }} />
      </span>
    </Popover>
  );
}
