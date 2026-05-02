import React, { useState, useEffect } from 'react';
import { Space, Input, Button, Breadcrumb } from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  PlusOutlined, 
  ExportOutlined,
  HomeOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { usePagePermission } from "@/hooks/usePagePermission";
import './QuyChaunHeader.state';
import { PaginationMeta } from '../table/QuyChaunTable.state';

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export const QuyChaunHeader: React.FC = () => {
  const handler = useQuyChaunHandler();
  const { canCreate, canExport } = usePagePermission("/danh-muc/quy-chuan");
  const [searchText] = useQuyChaunState('searchText', '');
  const [activeTab] = useQuyChaunState('activeTab', 'all');
  const [pagination] = useQuyChaunState('pagination', DEFAULT_PAGINATION);
  const [localSearchText, setLocalSearchText] = useState(searchText);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchText(e.target.value);
  };

  const handleClear = () => {
    setLocalSearchText('');
    handler.executeEvent('searchPaginated', { 
      keyword: '',
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

  return (
    <>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Cấu hình</Breadcrumb.Item>
        <Breadcrumb.Item>Quy chuẩn hạch toán</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <SettingOutlined />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Quy chuẩn hạch toán tự động</span>
        </Space>
        
        <Space>
          <Input.Search
            placeholder="Tìm kiếm nghiệp vụ..."
            prefix={<SearchOutlined />}
            value={localSearchText}
            onChange={handleSearchChange}
            onSearch={handleSearch}
            onClear={handleClear}
            style={{ width: 250 }}
            allowClear
          />
          {canExport && (
            <Button icon={<ExportOutlined />}>Xuất Excel</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Làm mới
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm mới
            </Button>
          )}
        </Space>
      </div>
    </>
  );
};
