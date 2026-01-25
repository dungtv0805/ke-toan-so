import { Button } from "antd";
import { SaveOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";

export function FormActions() {
  const navigate = useNavigate();
  const handler = useNhatKyChungFormHandler();
  const [submitting] = useNhatKyChungFormState("submitting", false);
  const [isEditing] = useNhatKyChungFormState("isEditing", false);

  const handleSubmit = async () => {
    await handler.executeEvent("submitForm", {});
  };

  const handleSubmitAndNew = async () => {
    await handler.executeEvent("submitForm", {});
    // Reset form for new entry
    await handler.executeEvent("resetForm", {});
  };

  const handleCancel = () => {
    navigate("/chung-tu/nhat-ky-chung");
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row justify-end mt-4 pt-4 border-t gap-2 sm:gap-3">
      <Button
        icon={<CloseOutlined />}
        onClick={handleCancel}
        className="w-full sm:w-auto"
      >
        Hủy
      </Button>
      {!isEditing && (
        <Button
          icon={<PlusOutlined />}
          onClick={handleSubmitAndNew}
          loading={submitting}
          className="w-full sm:w-auto"
        >
          Lưu & Tạo mới
        </Button>
      )}
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSubmit}
        loading={submitting}
        className="w-full sm:w-auto"
      >
        {isEditing ? "Cập nhật" : "Lưu"}
      </Button>
    </div>
  );
}
