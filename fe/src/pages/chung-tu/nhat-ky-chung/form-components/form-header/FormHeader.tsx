import {
  Form,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
} from "antd";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";
import { ChungTuHeader } from "../../form-handler/sub-handler/init/init.state";
import { LoaiGiaoDich } from "@/types";

export function FormHeader() {
  const handler = useNhatKyChungFormHandler();
  const [header] = useNhatKyChungFormState("header", null);
  const [isEditing] = useNhatKyChungFormState("isEditing", false);
  const [loaiGiaoDichList] = useNhatKyChungFormState("loaiGiaoDichList", [] as LoaiGiaoDich[]);

  // Convert loaiGiaoDichList to options format
  const loaiGiaoDichOptions = loaiGiaoDichList.map((lgd: LoaiGiaoDich) => ({
    value: lgd.ma,
    label: lgd.ten,
  }));

  const handleFieldChange = (field: keyof ChungTuHeader, value: unknown) => {
    handler.executeEvent("updateHeader", { field, value });
  };

  const handleLoaiGiaoDichChange = (value: string) => {
    handler.executeEvent("handleLoaiGiaoDichChange", { loaiGiaoDich: value });
  };

  return (
    <div className="mb-4 sm:mb-6">
      {/* Row 1: Số phiếu, Ngày chứng từ, Loại giao dịch */}
      <Row gutter={[16, 8]}>
        {isEditing && header?.soPhieu && (
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item label="Số phiếu" className="mb-2 sm:mb-3">
              <Input value={header.soPhieu} disabled className="font-semibold" />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} sm={12} md={isEditing ? 6 : 8} lg={isEditing ? 4 : 6}>
          <Form.Item
            label="Ngày chứng từ"
            required
            className="mb-2 sm:mb-3"
          >
            <DatePicker
              format="DD/MM/YYYY"
              className="w-full"
              value={header?.ngay}
              onChange={(date) => handleFieldChange("ngay", date)}
              placeholder="Chọn ngày"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={isEditing ? 6 : 8} lg={isEditing ? 4 : 6}>
          <Form.Item
            label="Loại giao dịch"
            required
            className="mb-2 sm:mb-3"
          >
            <Select
              placeholder="Chọn loại giao dịch"
              disabled={isEditing}
              value={header?.loaiGiaoDich}
              onChange={handleLoaiGiaoDichChange}
              options={loaiGiaoDichOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={isEditing ? 6 : 8} lg={isEditing ? 4 : 6}>
          <Form.Item label="Người giao dịch" className="mb-2 sm:mb-3">
            <Input
              placeholder="Nhập tên người giao dịch"
              value={header?.nguoiGiaoDich || ""}
              onChange={(e) =>
                handleFieldChange("nguoiGiaoDich", e.target.value)
              }
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={isEditing ? 6 : 8} lg={isEditing ? 8 : 6}>
          <Form.Item label="Địa chỉ" className="mb-2 sm:mb-3">
            <Input
              placeholder="Nhập địa chỉ"
              value={header?.diaChi || ""}
              onChange={(e) =>
                handleFieldChange("diaChi", e.target.value)
              }
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 2: Diễn giải chung và Ghi chú */}
      <Row gutter={[16, 8]}>
        <Col xs={24} md={12}>
          <Form.Item label="Diễn giải chung" className="mb-2 sm:mb-3">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập diễn giải chung cho chứng từ"
              value={header?.dienGiaiChung || ""}
              onChange={(e) => handleFieldChange("dienGiaiChung", e.target.value)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Ghi chú" className="mb-2 sm:mb-3">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập ghi chú (nếu có)"
              value={header?.ghiChu || ""}
              onChange={(e) =>
                handleFieldChange("ghiChu", e.target.value)
              }
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
