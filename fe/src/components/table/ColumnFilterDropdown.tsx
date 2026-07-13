import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';
import { DEFAULT_OP, FILTER_OPS, type ColumnFilter, type FilterOp } from './columnFilter';

interface Props {
  /** Nhãn cột, hiện ở dòng "Lọc {title}". */
  title: string;
  filter: ColumnFilter | undefined;
  pinned: boolean;
  onApply: (filter: ColumnFilter | undefined) => void;
  onTogglePin: () => void;
  /** antd cấp sẵn: đóng popover. */
  onClose: () => void;
}

/**
 * Popover lọc ở header cột: cố định cột + chọn toán tử + nhập giá trị.
 * Giá trị gõ dở chỉ nằm trong state cục bộ — bảng chỉ lọc lại khi bấm "Lọc" (hoặc Enter).
 */
const ColumnFilterDropdown: React.FC<Props> = ({
  title,
  filter,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  const [op, setOp] = useState<FilterOp>(filter?.op ?? DEFAULT_OP);
  const [value, setValue] = useState(filter?.value ?? '');

  // Mở lại popover sau khi bộ lọc đổi từ ngoài (vd bấm "Bỏ lọc") → hiện đúng trạng thái.
  useEffect(() => {
    setOp(filter?.op ?? DEFAULT_OP);
    setValue(filter?.value ?? '');
  }, [filter]);

  const apply = () => {
    onApply(value.trim() === '' ? undefined : { op, value });
    onClose();
  };

  const clear = () => {
    setOp(DEFAULT_OP);
    setValue('');
    onApply(undefined);
    onClose();
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: 260,
      }}
      // Chặn click lọt xuống header (antd dùng click header để sort/resize).
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="text" size="small" icon={<PushpinOutlined />} onClick={onTogglePin}>
        {pinned ? 'Bỏ cố định cột' : 'Cố định cột này'}
      </Button>

      <Divider style={{ margin: '8px 0' }} />

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
        <Select
          size="small"
          variant="borderless"
          value={op}
          options={FILTER_OPS}
          onChange={setOp}
          style={{ minWidth: 120 }}
        />
      </div>

      <Input
        autoFocus
        size="small"
        placeholder="Nhập giá trị lọc"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={apply}
        style={{ marginBottom: 12 }}
      />

      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={clear}>
          Bỏ lọc
        </Button>
        <Button size="small" type="primary" onClick={apply}>
          Lọc
        </Button>
      </Space>
    </div>
  );
};

export default ColumnFilterDropdown;
