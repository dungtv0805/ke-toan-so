import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';
import {
  DEFAULT_NUMBER_OP,
  DEFAULT_TEXT_OP,
  NUMBER_OPS,
  TEXT_OPS,
  isValuelessOp,
  parseFilterNumber,
  type ColumnFilter,
  type FilterKind,
  type NumberFilter,
  type NumberOp,
  type TextFilter,
  type TextOp,
} from './columnFilter';

interface Props {
  /** Nhãn cột, hiện ở dòng "Lọc {title}". */
  title: string;
  /** Cột chữ / cột số / cột chọn từ danh mục — quyết định cách nhập giá trị. */
  kind: FilterKind;
  filter: ColumnFilter | undefined;
  /** Danh sách chọn, BẮT BUỘC khi `kind='select'`. */
  options?: { value: string; label: string }[];
  onApply: (filter: ColumnFilter | undefined) => void;
  /** antd cấp sẵn: đóng popover. */
  onClose: () => void;
  /** Ghim cột — bỏ trống thì popover không có mục cố định cột. */
  pinned?: boolean;
  onTogglePin?: () => void;
}

const defaultOpOf = (kind: FilterKind): TextOp | NumberOp =>
  kind === 'number' ? DEFAULT_NUMBER_OP : DEFAULT_TEXT_OP;

/** Bộ lọc hiện tại nếu đúng kiểu cột VÀ là loại có toán tử (chữ/số). */
function opFilterOf(
  filter: ColumnFilter | undefined,
  kind: FilterKind,
): TextFilter | NumberFilter | undefined {
  if (!filter || filter.kind !== kind) return undefined;
  return filter.kind === 'select' ? undefined : filter;
}

/** Khung chung của popover — chặn click lọt xuống header (antd dùng click header để sort/resize). */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: '#fff',
      padding: 12,
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 260,
    }}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </div>
);

const PinButton: React.FC<{ pinned?: boolean; onTogglePin?: () => void }> = ({
  pinned,
  onTogglePin,
}) =>
  onTogglePin ? (
    <>
      <Button type="text" size="small" icon={<PushpinOutlined />} onClick={onTogglePin}>
        {pinned ? 'Bỏ cố định cột' : 'Cố định cột này'}
      </Button>
      <Divider style={{ margin: '8px 0' }} />
    </>
  ) : null;

/**
 * Popover lọc ở header cột: cố định cột + chọn toán tử + nhập giá trị.
 * Giá trị gõ dở chỉ nằm trong state cục bộ — bảng chỉ lọc lại khi bấm "Lọc" (hoặc Enter).
 * Riêng cột `select` áp ngay khi chọn (không có gì để gõ dở).
 */
const ColumnFilterDropdown: React.FC<Props> = ({
  title,
  kind,
  filter,
  options,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  if (kind === 'select') {
    return (
      <Shell>
        <PinButton pinned={pinned} onTogglePin={onTogglePin} />
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Lọc {title}</div>
        <Select<string>
          autoFocus
          showSearch
          allowClear
          size="small"
          optionFilterProp="label"
          placeholder={`Chọn ${title.toLowerCase()}`}
          style={{ width: '100%' }}
          // Danh sách chọn phải nằm TRONG popover: render ra body thì antd coi là click
          // ngoài và đóng luôn popover lọc trước khi kịp chọn.
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          value={filter?.kind === 'select' && filter.value ? filter.value : undefined}
          options={options ?? []}
          onChange={(next) => {
            onApply(next ? { kind: 'select', value: next } : undefined);
            onClose();
          }}
        />
      </Shell>
    );
  }

  return <ValueFilterBody {...{ title, kind, filter, pinned, onApply, onTogglePin, onClose }} />;
};

/** Nhánh cột chữ / cột số: chọn toán tử rồi gõ giá trị. */
const ValueFilterBody: React.FC<Omit<Props, 'options'>> = ({
  title,
  kind,
  filter,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  const current = opFilterOf(filter, kind);
  const [op, setOp] = useState<TextOp | NumberOp>(current?.op ?? defaultOpOf(kind));
  const [value, setValue] = useState(current?.value ?? '');

  // Mở lại popover sau khi bộ lọc đổi từ ngoài (vd bấm "Bỏ lọc") → hiện đúng trạng thái.
  useEffect(() => {
    const f = opFilterOf(filter, kind);
    setOp(f?.op ?? defaultOpOf(kind));
    setValue(f?.value ?? '');
  }, [filter, kind]);

  const isNumber = kind === 'number';
  const valueless = isNumber && isValuelessOp(op as NumberOp);
  const invalid = isNumber && !valueless && value.trim() !== '' && parseFilterNumber(value) === null;

  const apply = () => {
    if (invalid) return;
    if (valueless) {
      onApply({ kind: 'number', op: op as NumberOp, value: '' });
      onClose();
      return;
    }
    if (value.trim() === '') {
      onApply(undefined);
      onClose();
      return;
    }
    onApply(
      isNumber
        ? { kind: 'number', op: op as NumberOp, value }
        : { kind: 'text', op: op as TextOp, value },
    );
    onClose();
  };

  const clear = () => {
    setOp(defaultOpOf(kind));
    setValue('');
    onApply(undefined);
    onClose();
  };

  return (
    <Shell>
      <PinButton pinned={pinned} onTogglePin={onTogglePin} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>Lọc {title}</span>
        <Select<string>
          size="small"
          variant="borderless"
          value={op}
          options={isNumber ? NUMBER_OPS : TEXT_OPS}
          onChange={(next) => setOp(next as TextOp | NumberOp)}
          style={{ minWidth: 150 }}
        />
      </div>

      {!valueless && (
        <>
          <Input
            autoFocus
            size="small"
            status={invalid ? 'error' : undefined}
            placeholder={isNumber ? 'Nhập số' : 'Nhập giá trị lọc'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={apply}
            style={{ marginBottom: invalid ? 4 : 12 }}
          />
          {invalid && (
            <div style={{ color: '#ff4d4f', fontSize: 12, marginBottom: 8 }}>
              Giá trị không hợp lệ
            </div>
          )}
        </>
      )}

      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={clear}>
          Bỏ lọc
        </Button>
        <Button size="small" type="primary" disabled={invalid} onClick={apply}>
          Lọc
        </Button>
      </Space>
    </Shell>
  );
};

export default ColumnFilterDropdown;
