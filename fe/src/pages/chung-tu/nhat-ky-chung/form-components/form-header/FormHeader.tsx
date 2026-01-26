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
    <Form layout="vertical" className="compact-form nkc-compact-header">
      {/* Row 1: Tất cả fields trên 1 hàng cho desktop */}
      <Row gutter={[12, 0]}>
        {isEditing && header?.soPhieu && (
          <Col xs={24} sm={8} md={4} lg={3}>
            <Form.Item label="Số phiếu" className="mb-2">
              <Input value={header.soPhieu} disabled className="font-semibold" size="small" />
            </Form.Item>
          </Col>
        )}
        <Col xs={12} sm={8} md={isEditing ? 4 : 5} lg={isEditing ? 3 : 4}>
          <Form.Item label="Ngày chứng từ" required className="mb-2">
            <DatePicker
              format="DD/MM/YYYY"
              className="w-full"
              value={header?.ngay}
              onChange={(date) => handleFieldChange("ngay", date)}
              placeholder="Chọn ngày"
              size="small"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={isEditing ? 4 : 5} lg={isEditing ? 3 : 4}>
          <Form.Item label="Loại giao dịch" required className="mb-2">
            <Select
              placeholder="Chọn loại giao dịch"
              disabled={isEditing}
              value={header?.loaiGiaoDich}
              onChange={handleLoaiGiaoDichChange}
              options={loaiGiaoDichOptions}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={isEditing ? 4 : 5} lg={isEditing ? 4 : 4}>
          <Form.Item label="Người giao dịch" className="mb-2">
            <Input
              placeholder="Nhập người giao dịch"
              value={header?.nguoiGiaoDich || ""}
              onChange={(e) => handleFieldChange("nguoiGiaoDich", e.target.value)}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={8} md={isEditing ? 4 : 5} lg={isEditing ? 4 : 4}>
          <Form.Item label="Địa chỉ" className="mb-2">
            <Input
              placeholder="Nhập địa chỉ"
              value={header?.diaChi || ""}
              onChange={(e) => handleFieldChange("diaChi", e.target.value)}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8} md={isEditing ? 4 : 4} lg={isEditing ? 7 : 8}>
          <Form.Item label="Diễn giải chung" className="mb-2">
            <Input
              placeholder="Nhập diễn giải chung"
              value={header?.dienGiaiChung || ""}
              onChange={(e) => handleFieldChange("dienGiaiChung", e.target.value)}
              size="small"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
