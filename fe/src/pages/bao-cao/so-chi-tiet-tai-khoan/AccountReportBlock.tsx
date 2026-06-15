import React, { useMemo } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SoChiTietReport } from '@/services/soChiTietTaiKhoanService';
import { buildDisplayRows, type DisplayRow } from './columnRegistry';

const { Text } = Typography;

interface Props {
  report: SoChiTietReport;
  columns: ColumnsType<DisplayRow>;
  scrollX: number;
}

const AccountReportBlock: React.FC<Props> = ({ report, columns, scrollX }) => {
  const dataSource = useMemo(() => buildDisplayRows(report), [report]);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 8 }}>
        <div>
          Tài khoản:{' '}
          <Text strong>
            {report.taiKhoan.ma} - {report.taiKhoan.ten}
          </Text>
        </div>
        {report.doiTuong && (
          <div>
            Đối tượng:{' '}
            <Text strong>
              {report.doiTuong.ma} - {report.doiTuong.ten}
            </Text>
          </div>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: scrollX }}
        rowClassName={(r) => (r.kind === 'entry' ? '' : 'sct-summary-row')}
      />
    </div>
  );
};

export default AccountReportBlock;
