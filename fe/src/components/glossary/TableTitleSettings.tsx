import { useState } from 'react';
import { Button, Drawer, Input, Radio, Space, Table, Tooltip, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveTerm, TERM_REGISTRY } from '@/config/termRegistry';
import { buildTitleGlossary, titleKey, type TitleTermSpec } from '@/config/titleConfig';
import { nganhService } from '@/services/nganhService';
import { tenantService } from '@/services/tenantService';

interface Props {
  terms: TitleTermSpec[];
  buttonText?: string;
}

type Target = 'nganh' | 'tenant';

export function TableTitleSettings({ terms, buttonText }: Props) {
  const { t } = useTerm();
  const { user, currentTenant, currentNganh, applyGlossary, applyNganhGlossary } = useAuth();
  const canNganh = !!user?.isSuperAdmin && !!currentNganh;

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>('tenant');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const defaults: Record<string, string> = {};
  for (const term of terms) {
    defaults[titleKey(term)] = resolveTerm(undefined, undefined, TERM_REGISTRY, term.tk, term.surface);
  }

  const onOpen = () => {
    const init: Record<string, string> = {};
    for (const term of terms) init[titleKey(term)] = t(term.tk, term.surface);
    setValues(init);
    setTarget(canNganh ? 'nganh' : 'tenant');
    setOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (target === 'nganh' && currentNganh) {
        const next = buildTitleGlossary(currentNganh.glossary, terms, values, defaults);
        const res = await nganhService.update(currentNganh.id, { glossary: next });
        applyNganhGlossary(res.glossary);
      } else {
        const next = buildTitleGlossary(currentTenant?.glossary, terms, values, defaults);
        const res = await tenantService.updateGlossary(next);
        applyGlossary(res.glossary);
      }
      message.success('Đã lưu tiêu đề');
      setOpen(false);
    } catch {
      message.error('Lưu tiêu đề thất bại');
    } finally {
      setSaving(false);
    }
  };

  const dataSource = terms.map((term) => {
    const key = titleKey(term);
    return { key, def: defaults[key], term };
  });

  return (
    <>
      <Tooltip title="Đổi tiêu đề cột">
        <Button size="small" icon={<SettingOutlined />} onClick={onOpen}>
          {buttonText}
        </Button>
      </Tooltip>
      <Drawer
        title="Đổi tiêu đề hiển thị"
        width={520}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button type="primary" loading={saving} onClick={handleSave}>
            Lưu
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {canNganh && (
            <Radio.Group value={target} onChange={(e) => setTarget(e.target.value)}>
              <Radio value="nganh">Cả lĩnh vực{currentNganh ? ` (${currentNganh.name})` : ''}</Radio>
              <Radio value="tenant">Chỉ công ty này</Radio>
            </Radio.Group>
          )}
          <Table
            size="small"
            pagination={false}
            dataSource={dataSource}
            columns={[
              { title: 'Tên mặc định', dataIndex: 'def', width: 200 },
              {
                title: 'Tên hiển thị',
                render: (_: unknown, row: { key: string; def: string }) => (
                  <Input
                    size="small"
                    value={values[row.key] ?? ''}
                    placeholder={row.def}
                    onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                  />
                ),
              },
            ]}
          />
        </Space>
      </Drawer>
    </>
  );
}
