import { useEffect } from "react";
import { Card, Tabs } from "antd";
import {
  AuditOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
  BankOutlined,
  ShoppingOutlined,
  DollarOutlined,
  AppstoreOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { SummaryType } from "@/services/nhatKyChungService";
import { EntryListTab } from "./EntryListTab";
import { SummaryTab } from "./SummaryTab";
import { TeamTab } from "./TeamTab";
import { EmployeeTab } from "./EmployeeTab";
import { ProjectTab } from "./ProjectTab";
import { ChuDauTuTab } from "./ChuDauTuTab";
import { SanPhamTab } from "./SanPhamTab";
import { DongTienTab } from "./DongTienTab";
import { NhomQuanLyTab } from "./NhomQuanLyTab";
import { NhomKhuyenMaiTab } from "./NhomKhuyenMaiTab";
import "./DataTabs.state";

// Map tab key to summary type for API calls
const TAB_TO_SUMMARY_TYPE: Record<string, SummaryType> = {
  summary: "account",
  team: "team",
  employee: "employee",
  project: "project",
  chudautu: "investor",
  sanpham: "product",
  dongtien: "cash-flow",
  nhomquanly: "management-group",
  nhomkm: "promotion-group",
};

export function DataTabs() {
  const [activeTab, setActiveTab] = useNhatKyChungState("activeTab", "list");
  const handler = useNhatKyChungHandler();

  // Load summary data when switching to a summary tab
  useEffect(() => {
    const summaryType = TAB_TO_SUMMARY_TYPE[activeTab];
    if (summaryType) {
      handler.executeEvent("loadSummary", { type: summaryType });
    }
  }, [activeTab, handler]);

  return (
    <Card
      className="shadow-sm animate-fade-in-up"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        // maxHeight: "calc(150vh)",
        display: "flex",
        flexDirection: "column",
      }}
      styles={{
        body: {
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: (
              <span>
                <AuditOutlined className="mr-2" />
                Danh sách bút toán
              </span>
            ),
            children: <EntryListTab />,
          },
          {
            key: "summary",
            label: (
              <span>
                <FilterOutlined className="mr-2" />
                Tổng hợp theo TK
              </span>
            ),
            children: <SummaryTab />,
          },
          {
            key: "team",
            label: (
              <span>
                <TeamOutlined className="mr-2" />
                Phân bổ theo Đội
              </span>
            ),
            children: <TeamTab />,
          },
          {
            key: "employee",
            label: (
              <span>
                <UserOutlined className="mr-2" />
                Phân bổ theo NV
              </span>
            ),
            children: <EmployeeTab />,
          },
          {
            key: "project",
            label: (
              <span>
                <ProjectOutlined className="mr-2" />
                Phân bổ theo Dự án
              </span>
            ),
            children: <ProjectTab />,
          },
          {
            key: "chudautu",
            label: (
              <span>
                <BankOutlined className="mr-2" />
                Theo Chủ đầu tư
              </span>
            ),
            children: <ChuDauTuTab />,
          },
          {
            key: "sanpham",
            label: (
              <span>
                <ShoppingOutlined className="mr-2" />
                Theo Sản phẩm
              </span>
            ),
            children: <SanPhamTab />,
          },
          {
            key: "dongtien",
            label: (
              <span>
                <DollarOutlined className="mr-2" />
                Theo Dòng tiền
              </span>
            ),
            children: <DongTienTab />,
          },
          {
            key: "nhomquanly",
            label: (
              <span>
                <AppstoreOutlined className="mr-2" />
                Theo Nhóm QL
              </span>
            ),
            children: <NhomQuanLyTab />,
          },
          {
            key: "nhomkm",
            label: (
              <span>
                <GiftOutlined className="mr-2" />
                Theo Nhóm KM
              </span>
            ),
            children: <NhomKhuyenMaiTab />,
          },
        ]}
      />
    </Card>
  );
}
