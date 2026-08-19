import React, { useEffect } from "react";
import { Card, Skeleton } from "antd";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  KeHoachFormHandlerProvider,
  useKeHoachFormHandler,
  useKeHoachFormState,
} from "./KeHoachFormHandlerContext";
import { FormHeader } from "./components/FormHeader";
import { DongTable } from "./components/DongTable";
import { FormActions } from "./components/FormActions";

interface Props {
  loaiKeHoach: LoaiKeHoach;
}

const KeHoachFormPageInner: React.FC<Props> = ({ loaiKeHoach }) => {
  const handler = useKeHoachFormHandler();
  const [loading] = useKeHoachFormState("loading", true);

  useEffect(() => {
    handler.executeEvent("init", { loaiKeHoach });
  }, [handler, loaiKeHoach]);

  // Dùng lại đúng bộ layout của form chứng từ để hai màn hình nhìn như một.
  return (
    <div className="nkc-form-page nkc-form-page-layout">
      <Card
        className="shadow-sm nkc-header-card"
        size="small"
        title={
          <span className="text-gray-600 font-medium text-sm">
            {loaiKeHoach === "DU_BAO" ? "Thông tin dự báo" : "Thông tin kế hoạch"}
          </span>
        }
        styles={{ body: { padding: "8px 12px" } }}
      >
        {loading ? <Skeleton active paragraph={{ rows: 1 }} /> : <FormHeader />}
      </Card>

      <div className="nkc-detail-section">
        <Card
          className="shadow-sm nkc-detail-card"
          size="small"
          title={<span className="text-gray-600 font-medium text-sm">Chi tiết dòng kế hoạch</span>}
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div className="p-3">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : (
            <DongTable />
          )}
        </Card>
      </div>

      <FormActions />
    </div>
  );
};

const KeHoachFormPage: React.FC<Props> = ({ loaiKeHoach }) => (
  <KeHoachFormHandlerProvider>
    <KeHoachFormPageInner loaiKeHoach={loaiKeHoach} />
  </KeHoachFormHandlerProvider>
);

export default KeHoachFormPage;
