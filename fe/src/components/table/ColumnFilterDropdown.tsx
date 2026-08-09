import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PushpinOutlined, SearchOutlined } from '@ant-design/icons';
import {
  DEFAULT_NUMBER_OP,
  DEFAULT_TEXT_OP,
  NUMBER_OPS,
  TEXT_OPS,
  fold,
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
      <SelectFilterBody
        {...{ title, filter, options, pinned, onApply, onTogglePin, onClose }}
      />
    );
  }

  return <ValueFilterBody {...{ title, kind, filter, pinned, onApply, onTogglePin, onClose }} />;
};

/**
 * Nhánh cột chọn-từ-danh-mục: ô tìm kiếm + danh sách NGAY BÊN DƯỚI, trong cùng một
 * popover. Trước đây dùng `Select` — nó tự bung thêm một tầng popup nữa, nhìn thành
 * hai popup chồng nhau.
 */
const SelectFilterBody: React.FC<Omit<Props, 'kind'>> = ({
  title,
  filter,
  options,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const selected = filter?.kind === 'select' ? filter.value : '';

  const needle = fold(search);
  const matched = (options ?? []).filter((o) => fold(o.label).includes(needle));

  const pick = (value: string) => {
    onApply(value ? { kind: 'select', value } : undefined);
    onClose();
  };

  return (
    <Shell>
      <PinButton pinned={pinned} onTogglePin={onTogglePin} />
      <div style={{ fontWeight: 500, marginBottom: 8 }}>Lọc {title}</div>

      <Input
        autoFocus
        size="small"
        allowClear
        prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
        placeholder={`Tìm ${title.toLowerCase()}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        // Gõ xong Enter → lấy luôn mục đầu tiên, khỏi phải rời tay khỏi bàn phím.
        onPressEnter={() => matched[0] && pick(matched[0].value)}
      />

      <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
        {selected && <OptionRow label="(Bỏ lọc)" muted onPick={() => pick('')} />}

        {matched.map((o) => (
          <OptionRow
            key={o.value}
            label={o.label}
            active={o.value === selected}
            onPick={() => pick(o.value)}
          />
        ))}

        {matched.length === 0 && (
          <div style={{ padding: '8px 4px', color: 'rgba(0,0,0,.45)' }}>
            Không có dữ liệu
          </div>
        )}
      </div>
    </Shell>
  );
};

/** Một dòng trong danh sách chọn. Tự tô nền khi rê chuột (inline style không có :hover). */
const OptionRow: React.FC<{
  label: string;
  active?: boolean;
  muted?: boolean;
  onPick: () => void;
}> = ({ label, active, muted, onPick }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      role="option"
      aria-selected={!!active}
      title={label}
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: active ? 600 : undefined,
        color: muted ? 'rgba(0,0,0,.45)' : undefined,
        background: active ? '#e6f4ff' : hover ? '#f5f5f5' : undefined,
      }}
    >
      {label}
    </div>
  );
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
