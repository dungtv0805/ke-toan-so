import React, { useEffect } from 'react';
import { Card, Space } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { QuyChaunHandlerProvider, useQuyChaunHandler } from './QuyChaunHandlerContext';
import { QuyChaunHeader } from './components/header/QuyChaunHeader';
import { QuyChaunStats } from './components/stats/QuyChaunStats';
import { QuyChaunTable } from './components/table/QuyChaunTable';
import { QuyChaunForm } from './components/form/QuyChaunForm';

const QuyChaunPageInner: React.FC = () => {
  const handler = useQuyChaunHandler();

  useEffect(() => {
    handler.executeEvent('init', {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <QuyChaunHeader />
      
      <Card style={{ marginTop: 16 }}>
        <QuyChaunStats />
        
        <div style={{ 
          marginBottom: 16, 
          padding: '12px 16px', 
          backgroundColor: '#e6f7ff', 
          borderRadius: 6,
          border: '1px solid #91d5ff'
        }}>
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>
              Quy chuẩn hạch toán giúp tự động đề xuất tài khoản Nợ/Có khi tạo chứng từ dựa trên loại giao dịch và nghiệp vụ.
            </span>
          </Space>
        </div>

        <QuyChaunTable />
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
