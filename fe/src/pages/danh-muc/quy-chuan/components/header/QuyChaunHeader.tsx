import React, { useState, useEffect, useMemo } from 'react';
import { Space, Button } from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { FilterBar } from '@/components/common/FilterBar';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { usePagePermission } from "@/hooks/usePagePermission";
import { ImportDanhMucButton } from '@/components/import-danh-muc';
import { quyChuanImportConfig } from '@/components/import-danh-muc/configs';
import { ExportDanhMucButton, ExportDanhMucConfig } from '@/components/export-danh-muc';
import { quyChauanService } from '@/services/quyChaunService';
import './QuyChaunHeader.state';
import { PaginationMeta } from '../table/QuyChaunTable.state';

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

interface QuyChaunHeaderProps {
  settingsButton?: React.ReactNode;
  /** Nút "Xóa đã chọn (N)" — do trang cha dựng (useBulkDelete). */
  bulkDeleteButton?: React.ReactNode;
}

export const QuyChaunHeader: React.FC<QuyChaunHeaderProps> = ({ settingsButton, bulkDeleteButton }) => {
  const handler = useQuyChaunHandler();
  const { canCreate, canExport } = usePagePermission("/danh-muc/quy-chuan");
  const [searchText] = useQuyChaunState('searchText', '');
  const [activeTab] = useQuyChaunState('activeTab', 'all');
  const [pagination] = useQuyChaunState('pagination', DEFAULT_PAGINATION);
  const [localSearchText, setLocalSearchText] = useState(searchText);

  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-quy-chuan",
    sheetName: "Quy chuẩn",
    title: "DANH MỤC QUY CHUẨN HẠCH TOÁN",
    columns: [
      { header: "Nghiệp vụ", dataKey: "nghiepVu", width: 30 },
      { header: "Loại giao dịch", dataKey: "loaiGiaoDich", width: 20 },
      { header: "TK Nợ", dataKey: "tkNo", width: 12 },
      { header: "TK Có", dataKey: "tkCo", width: 12 },
      { header: "Mô tả", dataKey: "moTa", width: 40 },
    ],
    fetchData: async () => {
      const data = await quyChauanService.getAll();
      return data.map((item) => ({
        nghiepVu: item.nghiepVu || item.ten || "",
        loaiGiaoDich: item.loaiGiaoDichMa || "",
        tkNo: item.tkNo || "",
        tkCo: item.tkCo || "",
        moTa: item.moTa || "",
      }));
    },
  }), []);

  // Sync local state with global state (for refresh button)
  useEffect(() => {
    setLocalSearchText(searchText);
  }, [searchText]);

  const handleSearch = (value: string) => {
    // Use paginated search API
    handler.executeEvent('searchPaginated', { 
      keyword: value,
      page: 1,
      limit: pagination.limit,
      loaiGiaoDich: activeTab === 'all' ? undefined : activeTab,
    });
  };

  const handleRefresh = () => {
    handler.executeEvent('refresh', {});
  };

  const handleAdd = () => {
    handler.executeEvent('openModal', {});
  };

  const handleImported = () => {
    handler.executeEvent('refresh', {});
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <SettingOutlined />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Quy chuẩn hạch toán tự động</span>
        </Space>
      </div>

      <FilterBar
        search={{
          value: localSearchText,
          onChange: setLocalSearchText,
          onSearch: () => handleSearch(localSearchText),
          placeholder: 'Tìm kiếm nghiệp vụ...',
          width: 250,
        }}
        onReset={handleRefresh}
        actions={
          <>
            {settingsButton}
            <ExportDanhMucButton config={exportConfig} canExport={canExport} />
            <ImportDanhMucButton
              config={quyChuanImportConfig}
              canCreate={canCreate}
              onImported={handleImported}
            />
            {bulkDeleteButton}
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Thêm mới
              </Button>
            )}
          </>
        }
      />
    </>
  );
};
