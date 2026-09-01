import React, { useEffect, useMemo, useState } from "react";
import { Select, Space, Typography } from "antd";
import { PieChartOutlined } from "@ant-design/icons";
import { Pnl3LopTab } from "@/pages/ke-hoach/tabs/pnl-3-lop/Pnl3LopTab";
import { keHoachService } from "@/services/keHoachService";

const { Text } = Typography;

/** Chuỗi rỗng = không lọc phiên bản. Không dùng undefined: antd hiện ô trống, mất nhãn. */
const TAT_CA_PHIEN_BAN = "";

/**
 * P&L SO SÁNH KẾ HOẠCH – DỰ BÁO – THỰC HIỆN.
 *
 * Trước đây bảng này là một tab bên trong trang Kế hoạch và trang Dự báo. Sai
 * chỗ: đứng trong trang Kế hoạch thì chưa thể có số Thực hiện lẫn Dự báo để mà
 * so — mỗi trang KẾ HOẠCH / DỰ BÁO / THỰC HIỆN chỉ nên có P&L của chính nó.
 * Bảng ba lớp là BÁO CÁO, nên nằm ở menu Báo cáo.
 *
 * Thân bảng giữ nguyên `Pnl3LopTab` cũ, không nhân bản: trang này chỉ thêm
 * thanh chọn Năm và Phiên bản mà `KeHoachTabsPage` từng cấp cho nó.
 */
const Pnl3LopPage: React.FC = () => {
  const [nam, setNam] = useState(() => new Date().getFullYear());
  const [phienBan, setPhienBan] = useState<string>(TAT_CA_PHIEN_BAN);
  const [phienBanList, setPhienBanList] = useState<string[]>([]);

  useEffect(() => {
    // Phiên bản dùng để lọc lớp KẾ HOẠCH — lấy đúng danh sách của kế hoạch.
    keHoachService
      .getPhienBanOptions("KE_HOACH")
      .then(setPhienBanList)
      .catch(() => setPhienBanList([]));
  }, []);

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
      <div
        className="flex flex-wrap items-center justify-between gap-2"
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
            P&L so sánh Kế hoạch – Dự báo – Thực hiện
          </Text>
        </div>
        <Space wrap>
          <Select
            value={phienBan}
            onChange={setPhienBan}
            style={{ width: 200 }}
            options={[
              { label: "Tất cả phiên bản", value: TAT_CA_PHIEN_BAN },
              ...phienBanList.map((p) => ({ label: p, value: p })),
            ]}
          />
          <Select
            value={nam}
            onChange={setNam}
            options={namOptions}
            style={{ width: 140 }}
          />
        </Space>
      </div>

      <div className="flex flex-col flex-1 min-h-0 pt-2">
        <Pnl3LopTab nam={nam} phienBan={phienBan || undefined} />
      </div>
    </div>
  );
};

export default Pnl3LopPage;
