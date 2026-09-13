import React, { useMemo, useState } from "react";
import { Select, Space, Typography } from "antd";
import { PieChartOutlined } from "@ant-design/icons";
import { KqkdTab } from "@/pages/ke-hoach/tabs/kqkd/KqkdTab";

const { Text } = Typography;

/**
 * P&L THỰC HIỆN — bảng P&L của số thực tế.
 *
 * Dùng lại NGUYÊN `KqkdTab` của trang Kế hoạch, chỉ đổi nguồn sang 'THUC_HIEN'.
 * Cố ý không nhân bản bảng: cùng một component, cùng một hàm dựng dòng, và BE
 * cũng chạy cùng một `buildKqkdKeHoach` — nên P&L Kế hoạch, P&L Thực hiện và
 * lớp Thực hiện của trang So sánh không thể lệch nhau một dòng nào.
 *
 * Bản cũ của trang này là bảng một cột "Số tiền" theo kỳ Tháng này / Tháng
 * trước / Lũy kế, lấy từ `pnlService` — khác hẳn khung chỉ tiêu của Kế hoạch nên
 * không so được. Đã bỏ.
 */
const PnLPage: React.FC = () => {
  const [nam, setNam] = useState(() => new Date().getFullYear());

  const namOptions = useMemo(() => {
    const namNay = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => namNay - 3 + i).map((y) => ({
      label: `Năm ${y}`,
      value: y,
    }));
  }, []);

  return (
    // nkc-page: cao hết khung, chỉ thân bảng cuộn — giống các trang báo cáo khác.
    <div className="nkc-page">
      {/* Điện thoại: khung giữa chỉ lề 8px nên mép tràn -12px lòi ra ngoài 4px
          mỗi bên → cả trang cuộn ngang. */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 dt:!-mx-2 dt:!px-2"
        style={{
          marginInline: -12,
          padding: "10px 12px",
          background: "hsl(var(--background))",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex items-center gap-2">
          <PieChartOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">
            P&L Thực hiện
          </Text>
        </div>
        <Space wrap>
          <Select
            value={nam}
            onChange={setNam}
            options={namOptions}
            style={{ width: 140 }}
          />
        </Space>
      </div>

      <div className="flex flex-col flex-1 min-h-0 pt-2">
        <KqkdTab nam={nam} loaiKeHoach="THUC_HIEN" />
      </div>
    </div>
  );
};

export default PnLPage;
