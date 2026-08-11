import React from 'react';
import { Row, Col } from 'antd';
import RevenueTrendChart from '../components/RevenueTrendChart';
import CashFlowChart from '../components/CashFlowChart';
import ExecutionStatusCharts from '../components/ExecutionStatusCharts';
import RevenueExpenseBreakdownCharts from '../components/RevenueExpenseBreakdownCharts';
import CongNoChart from '../components/CongNoChart';
import BalanceStructureChart from '../components/BalanceStructureChart';
import NghiaVuChinhSachTable from '../components/NghiaVuChinhSachTable';
import type { TabProps } from './TabProps';

interface Props extends TabProps {
  /** Key các khối được bật trong cấu hình của tenant. */
  visibleKeys: string[];
}

/**
 * Tab Tổng quan — giữ đúng nội dung tab "Tài chính" trước đợt làm lại 5 tab:
 * chỉ các biểu đồ, bật/tắt theo cấu hình của tenant. Không có hàng KPI.
 */
const TongQuanTab: React.FC<Props> = ({ year, startMonth, endMonth, visibleKeys }) => {
  const show = (key: string) => visibleKeys.includes(key);

  return (
    <div className="space-y-3">
      {/* Xu hướng: KQKD | Dòng tiền */}
      {(show('kqkd') || show('dongTien')) && (
        <Row gutter={[12, 12]}>
          {show('kqkd') && (
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('dongTien') && (
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
        </Row>
      )}

      {/* Tình hình thực hiện */}
      {show('tinhHinhThucHien') && <ExecutionStatusCharts />}

      {/* Tỷ trọng doanh thu / chi phí */}
      {show('tyTrong') && (
        <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />
      )}

      {/* Công nợ | Cân đối tài chính */}
      {(show('congNo') || show('canDoi')) && (
        <Row gutter={[12, 12]}>
          {show('congNo') && (
            <Col xs={24} lg={12}>
              <CongNoChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('canDoi') && (
            <Col xs={24} lg={12}>
              <BalanceStructureChart />
            </Col>
          )}
        </Row>
      )}

      {/* Tình hình thực hiện nghĩa vụ chính sách */}
      {show('nghiaVuChinhSach') && <NghiaVuChinhSachTable year={year} />}
    </div>
  );
};

export default TongQuanTab;
