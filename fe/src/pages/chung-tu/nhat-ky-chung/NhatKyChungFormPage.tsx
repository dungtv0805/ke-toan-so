import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "antd";
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
    <div className="nkc-form-page">
      {/* Form Header Card */}
      <Card className="shadow-sm" size="small">
        <FormHeader />
      </Card>

      {/* Chi tiết hạch toán - Excel style */}
      <div className="excel-container mt-4">
        {/* Toolbar */}
        <div className="excel-toolbar">
          <span className="text-gray-600 font-medium text-sm">Chi tiết hạch toán</span>
        </div>

        <ChiTietTable />
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
