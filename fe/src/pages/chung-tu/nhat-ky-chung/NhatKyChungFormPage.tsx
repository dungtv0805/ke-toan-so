import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Collapse } from "antd";
import { DownOutlined } from "@ant-design/icons";
import {
  NhatKyChungFormHandlerProvider,
  useNhatKyChungFormHandler,
  useNhatKyChungFormState,
} from "./NhatKyChungFormHandlerContext";
import { FormHeader } from "./form-components/form-header/FormHeader";
import { ChiTietTable } from "./form-components/chi-tiet-table/ChiTietTable";
import { FormActions } from "./form-components/form-actions/FormActions";
import {
  FormHeaderSkeleton,
  ChiTietTableSkeleton,
  FormActionsSkeleton,
} from "./form-components/FormSkeleton";

function NhatKyChungFormPageInner() {
  const handler = useNhatKyChungFormHandler();
  const { soPhieu } = useParams<{ soPhieu?: string }>();
  const [loading] = useNhatKyChungFormState("loading", true);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    handler.executeEvent("init", { soPhieu });
  }, [handler, soPhieu]);

  if (loading) {
    return (
      <div className="nkc-form-page">
        <FormHeaderSkeleton />
        <ChiTietTableSkeleton />
        <FormActionsSkeleton />
      </div>
    );
  }

  return (
    <div className="nkc-form-page nkc-form-page-layout">
      {/* Form Header Card with Collapse */}
      <Card
        className="shadow-sm nkc-header-card"
        size="small"
        bodyStyle={{ padding: 0 }}
      >
        <Collapse
          ghost
          defaultActiveKey={["header"]}
          onChange={(keys) => setHeaderCollapsed(!keys.includes("header"))}
          expandIcon={({ isActive }) => (
            <DownOutlined rotate={isActive ? 0 : -90} className="text-gray-500" />
          )}
          items={[
            {
              key: "header",
              label: (
                <span className="font-medium text-gray-700">
                  Thông tin chứng từ
                </span>
              ),
              children: (
                <div className="px-1">
                  <FormHeader />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Chi tiết hạch toán - Excel style */}
      <div className={`nkc-detail-section ${headerCollapsed ? 'header-collapsed' : ''}`}>
        <Card
          className="shadow-sm nkc-detail-card"
          size="small"
          title={<span className="text-gray-600 font-medium text-sm">Chi tiết hạch toán</span>}
          bodyStyle={{ padding: 0 }}
        >
          <ChiTietTable />
        </Card>
      </div>

      <FormActions />
    </div>
  );
}

export default function NhatKyChungFormPage() {
  return (
    <NhatKyChungFormHandlerProvider>
      <NhatKyChungFormPageInner />
    </NhatKyChungFormHandlerProvider>
  );
}
