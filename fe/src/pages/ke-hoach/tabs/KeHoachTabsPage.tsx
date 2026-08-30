import React, { useEffect, useMemo, useState } from "react";
import { ConfigProvider, Segmented, Select, Space, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import KeHoachPage from "../KeHoachPage";
import { TabComingSoon } from "./TabComingSoon";
import { BanHangTab } from "./ban-hang/BanHangTab";
import { NhanSuTab } from "./nhan-su/NhanSuTab";
import { KqkdTab } from "./kqkd/KqkdTab";
import {
  keHoachService,
  type LoaiKeHoach,
} from "@/services/keHoachService";

const { Text } = Typography;

/** Chuỗi rỗng = không lọc phiên bản. Không dùng undefined: antd hiện ô trống, mất nhãn. */
const TAT_CA_PHIEN_BAN = "";

/** Sáu tab đầu là sáu sheet của file thiết kế; "Chi tiết" là lưới bút toán cũ. */
const TAB_OPTIONS = [
  { label: "Bán hàng", value: "ban-hang" },
  { label: "Nhân sự", value: "nhan-su" },
  { label: "KQKD", value: "kqkd" },
  { label: "Dòng tiền", value: "dong-tien" },
  { label: "Tài sản", value: "tai-san" },
  { label: "Nguồn vốn", value: "nguon-von" },
  { label: "Chi tiết", value: "chi-tiet" },
];

const KeHoachTabsPage: React.FC<{ loaiKeHoach: LoaiKeHoach }> = ({
  loaiKeHoach,
}) => {
  const [activeTab, setActiveTab] = useState("ban-hang");
  const [nam, setNam] = useState(() => new Date().getFullYear());
  // Gộp nhiều phiên bản kế hoạch vào một bảng KQKD là cộng trùng — cho chọn được.
  const [phienBan, setPhienBan] = useState<string>(TAT_CA_PHIEN_BAN);
  const [phienBanList, setPhienBanList] = useState<string[]>([]);

  useEffect(() => {
    keHoachService
      .getPhienBanOptions(loaiKeHoach)
      .then(setPhienBanList)
      .catch(() => setPhienBanList([]));
  }, [loaiKeHoach]);

  const namOptions = useMemo(() => {
    const nayNay = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => nayNay - 3 + i).map((y) => ({
      label: `Năm ${y}`,
      value: y,
    }));
  }, []);

  return (
    // nkc-page: cao hết khung, chỉ thân bảng cuộn — giống Dữ liệu tổng hợp.
    <div className="nkc-page">
      {/* Thanh tab bám đúng bố cục thanh tab của Tổng quan. */}
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
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">
            {loaiKeHoach === "DU_BAO" ? "Dự báo" : "Kế hoạch"}
          </Text>
        </div>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: "hsl(var(--primary))",
                itemSelectedColor: "#fff",
                itemColor: "hsl(var(--primary))",
                itemHoverColor: "hsl(var(--primary))",
                trackBg: "hsl(var(--primary) / 0.08)",
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          {activeTab === "kqkd" && (
            <Select
              value={phienBan}
              onChange={setPhienBan}
              style={{ width: 200 }}
              options={[
                { label: "Tất cả phiên bản", value: TAT_CA_PHIEN_BAN },
                ...phienBanList.map((p) => ({ label: p, value: p })),
              ]}
            />
          )}
          {/* Tab "Chi tiết" có bộ lọc kỳ riêng nên không dùng ô chọn năm này. */}
          {activeTab !== "chi-tiet" && (
            <Select
              value={nam}
              onChange={setNam}
              options={namOptions}
              style={{ width: 140 }}
            />
          )}
        </Space>
      </div>

      <div className="flex flex-col flex-1 min-h-0 pt-2">
        {activeTab === "ban-hang" && (
          <BanHangTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "nhan-su" && (
          <NhanSuTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "kqkd" && (
          <KqkdTab
            nam={nam}
            loaiKeHoach={loaiKeHoach}
            phienBan={phienBan || undefined}
          />
        )}
        {activeTab === "dong-tien" && (
          <TabComingSoon tieuDe="Kế hoạch dòng tiền" />
        )}
        {activeTab === "tai-san" && <TabComingSoon tieuDe="Kế hoạch tài sản" />}
        {activeTab === "nguon-von" && (
          <TabComingSoon tieuDe="Kế hoạch nguồn vốn" />
        )}
        {activeTab === "chi-tiet" && <KeHoachPage loaiKeHoach={loaiKeHoach} />}
      </div>
    </div>
  );
};

export default KeHoachTabsPage;
