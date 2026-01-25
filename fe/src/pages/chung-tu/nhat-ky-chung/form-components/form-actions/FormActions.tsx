import { Button, Space } from "antd";
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
    <div className="flex justify-end mt-6 pt-4 border-t">
      <Space>
        <Button icon={<CloseOutlined />} onClick={handleCancel}>
          Hủy
        </Button>
        {!isEditing && (
          <Button
            icon={<PlusOutlined />}
            onClick={handleSubmitAndNew}
            loading={submitting}
          >
            Lưu & Tạo mới
          </Button>
        )}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={submitting}
        >
          {isEditing ? "Cập nhật" : "Lưu"}
        </Button>
      </Space>
    </div>
  );
}
