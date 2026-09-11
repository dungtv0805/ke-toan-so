import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  ConfigProvider,
  Segmented,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { CheckCircleOutlined, SettingOutlined } from "@ant-design/icons";
import KeHoachPage from "../KeHoachPage";
import { BanHangTab } from "./ban-hang/BanHangTab";
import { NhanSuTab } from "./nhan-su/NhanSuTab";
import { KqkdTab } from "./kqkd/KqkdTab";
import { DongTienTab } from "./dong-tien/DongTienTab";
import { TaiSanTab } from "./tai-san/TaiSanTab";
import { NguonVonTab } from "./nguon-von/NguonVonTab";
import { DinhKhoanModal } from "./DinhKhoanModal";
import {
  keHoachService,
  type LoaiKeHoach,
} from "@/services/keHoachService";

const { Text } = Typography;

/** Chuỗi rỗng = không lọc phiên bản. Không dùng undefined: antd hiện ô trống, mất nhãn. */
const TAT_CA_PHIEN_BAN = "";

const TAB_HOP_LE = [
  "ban-hang", "nhan-su", "kqkd", "dong-tien", "tai-san", "nguon-von", "chi-tiet",
] as const;

/** Tab mở đầu, lấy từ ?tab= trên URL. Tab lạ thì về mặc định cũ. */
export const tabBanDau = (tab: string | null): string =>
  tab && (TAB_HOP_LE as readonly string[]).includes(tab) ? tab : "ban-hang";

/**
 * Sáu sheet của file thiết kế, một báo cáo P&L, và lưới bút toán "Chi tiết".
 *
 * Nhãn tab P&L đi theo `loaiKeHoach`: mỗi trang chỉ có P&L CỦA CHÍNH NÓ. Bảng
 * so sánh ba lớp KH–DB–TH nằm ở menu Báo cáo (`/bao-cao/pnl-3-lop`) — đứng
 * trong trang Kế hoạch thì chưa thể có số Thực hiện lẫn Dự báo để mà so.
 */
const tabOptions = (loaiKeHoach: LoaiKeHoach) => [
  { label: "Bán hàng", value: "ban-hang" },
  { label: "Nhân sự", value: "nhan-su" },
  {
    label: loaiKeHoach === "DU_BAO" ? "P&L Dự báo" : "P&L Kế hoạch",
    value: "kqkd",
  },
  { label: "Dòng tiền", value: "dong-tien" },
  { label: "Tài sản", value: "tai-san" },
  { label: "Nguồn vốn", value: "nguon-von" },
  { label: "Chi tiết", value: "chi-tiet" },
];

const KeHoachTabsPage: React.FC<{ loaiKeHoach: LoaiKeHoach }> = ({
  loaiKeHoach,
}) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => tabBanDau(searchParams.get("tab")));
  // URL đổi ?tab= mà không remount (4 mục menu cùng trỏ trang này) nên phải
  // đồng bộ tay. Bấm tab thủ công không đổi URL nên effect này không đá nhau
  // với thao tác người dùng.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (TAB_HOP_LE as readonly string[]).includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [nam, setNam] = useState(() => new Date().getFullYear());
  // Gộp nhiều phiên bản kế hoạch vào một bảng KQKD là cộng trùng — cho chọn được.
  const [phienBan, setPhienBan] = useState<string>(TAT_CA_PHIEN_BAN);
  const [phienBanList, setPhienBanList] = useState<string[]>([]);
  const [moDinhKhoan, setMoDinhKhoan] = useState(false);

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
      {/* Thanh tab bám đúng bố cục thanh tab của Tổng quan. Lề âm bằng đúng lề
          khung nội dung: 12px, điện thoại chỉ còn 8px (responsive.css) — giữ -12
          ở đó là thanh tràn ngang 4px mỗi bên. */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 -mx-[12px] dt:-mx-[8px]"
        style={{
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
                itemSelectedColor: "hsl(var(--primary-foreground))",
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
            options={tabOptions(loaiKeHoach)}
            size="large"
            // Bảy tab cỡ chữ 15 rộng ~650px, không xuống dòng được: điện thoại
            // thì cho thanh tab tự vuốt ngang thay vì đẩy cả trang tràn ra.
            className="font-semibold dt:!max-w-full dt:!overflow-x-auto"
          />
        </ConfigProvider>
        <Space wrap>
          <Tooltip title="Cặp Nợ/Có dùng khi sinh dòng hạch toán kế hoạch">
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setMoDinhKhoan(true)}
            >
              Định khoản
            </Button>
          </Tooltip>
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
          <DongTienTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "tai-san" && (
          <TaiSanTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "nguon-von" && (
          <NguonVonTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "chi-tiet" && <KeHoachPage loaiKeHoach={loaiKeHoach} />}
      </div>

      <DinhKhoanModal
        moLen={moDinhKhoan}
        dong={() => setMoDinhKhoan(false)}
      />
    </div>
  );
};

export default KeHoachTabsPage;
