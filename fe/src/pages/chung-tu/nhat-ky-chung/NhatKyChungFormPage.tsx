import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, Breadcrumb, Divider, Spin, Typography } from "antd";
import { HomeOutlined, FileTextOutlined } from "@ant-design/icons";
import {
  NhatKyChungFormHandlerProvider,
  useNhatKyChungFormHandler,
  useNhatKyChungFormState,
} from "./NhatKyChungFormHandlerContext";
import { FormHeader } from "./form-components/form-header/FormHeader";
import { ChiTietTable } from "./form-components/chi-tiet-table/ChiTietTable";
import { FormActions } from "./form-components/form-actions/FormActions";

const { Title } = Typography;

function NhatKyChungFormPageInner() {
  const handler = useNhatKyChungFormHandler();
  const { soPhieu } = useParams<{ soPhieu?: string }>();
  const [loading] = useNhatKyChungFormState("loading", true);
  const [isEditing] = useNhatKyChungFormState("isEditing", false);

  useEffect(() => {
    handler.executeEvent("init", { soPhieu });
  }, [handler, soPhieu]);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          {
            href: "/",
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            ),
          },
          { title: "Chứng từ" },
          { href: "/chung-tu/nhat-ky-chung", title: "Nhật ký chung" },
          { title: isEditing ? `Sửa: ${soPhieu}` : "Tạo mới" },
        ]}
      />

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <FileTextOutlined className="text-2xl text-primary" />
        <Title level={3} className="!mb-0">
          {isEditing ? "Sửa chứng từ" : "Tạo chứng từ mới"}
        </Title>
      </div>

      {/* Main Card */}
      <Card className="shadow-sm">
        <Spin spinning={loading}>
          <FormHeader />

          <Divider orientation="left" className="!mt-2 !mb-4">
            <span className="text-gray-600 font-medium">Chi tiết hạch toán</span>
          </Divider>

          <ChiTietTable />

          <FormActions />
        </Spin>
      </Card>
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
