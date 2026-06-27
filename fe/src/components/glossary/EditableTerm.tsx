import { useState, useEffect } from 'react';
import { Popover, Input, Radio, Button, Space, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { applyGlossaryEdit } from '@/config/glossaryEdit';
import { buildSaveOptions } from '@/config/saveTarget';
import { tenantService } from '@/services/tenantService';
import { nganhService } from '@/services/nganhService';

interface Props {
  tk: string;
  surface?: string;
}

export function EditableTerm({ tk, surface }: Props) {
  const { t } = useTerm();
  const { editMode } = useEditMode();
  const { user, currentTenant, currentNganh, applyGlossary, applyNganhGlossary } = useAuth();
  const label = t(tk, surface);

  const options = buildSaveOptions({
    isSuperAdmin: !!user?.isSuperAdmin,
    hasNganh: !!currentNganh,
    hasSurface: !!surface,
    nganhName: currentNganh?.name,
  });

  const valForScope = (scope: 'all' | 'surface') =>
    scope === 'surface' ? t(tk, surface) : t(tk);

  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(label);
  const [optValue, setOptValue] = useState(options[0]?.value ?? 'tenant-all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editMode) setOpen(false);
  }, [editMode]);

  if (!editMode) return <>{label}</>;

  const onOpenChange = (o: boolean) => {
    if (o) {
      setVal(valForScope(options[0]?.scope ?? 'all'));
      setOptValue(options[0]?.value ?? 'tenant-all');
    }
    setOpen(o);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!val.trim()) {
      message.warning('Nhãn không được để trống');
      return;
    }
    const opt = options.find((o) => o.value === optValue) ?? options[0];
    if (!opt) return;
    setSaving(true);
    try {
      const base = t(tk); // nhãn nền (không surface)
      if (opt.target === 'nganh' && currentNganh) {
        const next = applyGlossaryEdit(currentNganh.glossary, base, tk, val.trim(), opt.scope, surface);
        const res = await nganhService.update(currentNganh.id, { glossary: next });
        applyNganhGlossary(res.glossary);
      } else {
        const next = applyGlossaryEdit(currentTenant?.glossary, base, tk, val.trim(), opt.scope, surface);
        const res = await tenantService.updateGlossary(next);
        applyGlossary(res.glossary);
      }
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
        style={{ width: 240 }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={handleSave}
      />
      {options.length > 1 && (
        <Radio.Group
          size="small"
          value={optValue}
          onChange={(e) => {
            setOptValue(e.target.value);
            const opt = options.find((o) => o.value === e.target.value);
            if (opt) setVal(valForScope(opt.scope));
          }}
        >
          <Space direction="vertical" size={0}>
            {options.map((o) => (
              <Radio key={o.value} value={o.value}>{o.label}</Radio>
            ))}
          </Space>
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
