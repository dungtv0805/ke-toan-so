import React, { useEffect, useState, useCallback } from 'react';
import { Card } from 'antd';
import { QuyChaunHandlerProvider, useQuyChaunHandler, useQuyChaunState } from './QuyChaunHandlerContext';
import { QuyChaunHeader } from './components/header/QuyChaunHeader';
import { QuyChaunTable } from './components/table/QuyChaunTable';
import { QuyChaunForm } from './components/form/QuyChaunForm';
import { PaginationMeta } from './components/table/QuyChaunTable.state';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useBulkDelete } from '@/components/table/useBulkDelete';
import { quyChauanService } from '@/services/quyChaunService';
import { QuyChuan } from '@/types';
import { docCheDoXem, luuCheDoXem, type CheDoXem } from './lib/cheDoXem';

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

const QuyChaunPageInner: React.FC = () => {
  const handler = useQuyChaunHandler();
  const { canDelete } = usePagePermission('/danh-muc/quy-chuan');
  const [settingsButton, setSettingsButton] = useState<React.ReactNode>(null);
  const [cheDo, setCheDo] = useState<CheDoXem>(docCheDoXem);
  const handleSettingsButton = useCallback((btn: React.ReactNode) => {
    setSettingsButton(btn);
  }, []);

  // State/tải dữ liệu nằm ở trang cha, bảng chỉ hiển thị → hook xóa lô đặt ở đây.
  const [quyChaunList] = useQuyChaunState('quyChaunList', [] as QuyChuan[]);
  const [pagination] = useQuyChaunState('pagination', DEFAULT_PAGINATION);

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<QuyChuan>({
    enabled: canDelete,
    itemLabel: 'quy chuẩn',
    onDeleteBatch: (ids) => quyChauanService.deleteBatch(ids),
    // Tải lại đúng trang / bộ lọc đang xem (changePage giữ nguyên từ khóa + tab).
    onDone: () => {
      handler.executeEvent('changePage', {
        page: pagination.page,
        pageSize: pagination.limit,
      });
    },
  });

  // Đổi chế độ cũng phải bỏ chọn: sang dạng cây là mất luôn cột checkbox, giữ lại
  // lựa chọn cũ thì nút "Xóa đã chọn (N)" còn đứng đó mà không cách nào bỏ tick.
  const doiCheDo = useCallback(
    (v: CheDoXem) => {
      setCheDo(v);
      luuCheDoXem(v);
      clearSelection();
    },
    [clearSelection],
  );

  // Danh sách đổi (đổi trang / đổi tab / tìm kiếm / tải lại) → bỏ chọn, vì lựa chọn chỉ có
  // hiệu lực trong trang đang xem. Các thao tác đó nằm rải rác ở header và bảng con.
  useEffect(() => {
    clearSelection();
  }, [quyChaunList, clearSelection]);

  useEffect(() => {
    handler.executeEvent('init', {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <QuyChaunHeader settingsButton={settingsButton} bulkDeleteButton={bulkDeleteButton} />

      <Card style={{ marginTop: 16 }}>
        <QuyChaunTable
          onSettingsButton={handleSettingsButton}
          rowSelection={cheDo === 'cay' ? undefined : rowSelection}
          cheDo={cheDo}
          onDoiCheDo={doiCheDo}
        />
      </Card>

      <QuyChaunForm />
    </div>
  );
};

const QuyChaunPage: React.FC = () => {
  return (
    <QuyChaunHandlerProvider>
      <QuyChaunPageInner />
    </QuyChaunHandlerProvider>
  );
};

export default QuyChaunPage;
