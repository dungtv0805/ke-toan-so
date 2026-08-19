import React from "react";
import { Button } from "antd";
import { SaveOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useKeHoachFormHandler, useKeHoachFormState } from "../KeHoachFormHandlerContext";
import type { KeHoachFormHeader } from "../form-handler/sub-handler/init/init.state";

export const FormActions: React.FC = () => {
  const navigate = useNavigate();
  const handler = useKeHoachFormHandler();
  const [submitting] = useKeHoachFormState("submitting", false);
  const [header] = useKeHoachFormState("header");

  const duongDanDanhSach =
    (header as KeHoachFormHeader)?.loaiKeHoach === "DU_BAO"
      ? "/trung-tam-du-lieu/du-bao"
      : "/trung-tam-du-lieu/ke-hoach";

  const luu = async (giuLaiForm: boolean) => {
    const ok = await handler.executeEvent("submitForm", { giuLaiForm });
    if (ok && !giuLaiForm) navigate(duongDanDanhSach);
  };

  return (
    <div className="nkc-actions-bar">
      <Button icon={<CloseOutlined />} size="small" onClick={() => navigate(duongDanDanhSach)}>
        Hủy
      </Button>
      <Button
        icon={<PlusOutlined />}
        size="small"
        loading={submitting as boolean}
        onClick={() => luu(true)}
      >
        Lưu & Nhập tiếp
      </Button>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        size="small"
        loading={submitting as boolean}
        onClick={() => luu(false)}
      >
        Lưu
      </Button>
    </div>
  );
};
