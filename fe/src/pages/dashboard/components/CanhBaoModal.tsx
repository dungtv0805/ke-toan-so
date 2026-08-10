import React from 'react';
import { Modal, List, Empty, Tag } from 'antd';
import { Link } from 'react-router-dom';
import type { CanhBao, LoaiCanhBao } from '../canhBao';

const NHAN: Record<LoaiCanhBao, { text: string; color: string }> = {
  CONG_NO_QUA_HAN: { text: 'Quá hạn', color: 'red' },
  TIEN_AM: { text: 'Tiền âm', color: 'volcano' },
  LOI_NHUAN_AM: { text: 'Lỗ', color: 'orange' },
};

interface Props {
  open: boolean;
  items: CanhBao[];
  onClose: () => void;
}

const CanhBaoModal: React.FC<Props> = ({ open, items, onClose }) => (
  <Modal open={open} onCancel={onClose} footer={null} title="Cảnh báo tài chính" width={640}>
    {items.length === 0 ? (
      <Empty description="Không có cảnh báo" />
    ) : (
      <List
        size="small"
        dataSource={items}
        renderItem={(c) => (
          <List.Item>
            <div className="flex items-center gap-2 w-full">
              <Tag color={NHAN[c.loai].color}>{NHAN[c.loai].text}</Tag>
              <span className="flex-1">{c.moTa}</span>
              <Link to={c.duong} onClick={onClose}>Xem</Link>
            </div>
          </List.Item>
        )}
      />
    )}
  </Modal>
);

export default CanhBaoModal;
