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
    <Form layout="inline" className="nkc-inline-header">
      <Row gutter={[8, 4]} className="w-full">
        {isEditing && header?.soPhieu && (
          <Col flex="120px">
            <Form.Item label="Số phiếu" className="mb-0 w-full">
              <Input value={header.soPhieu} disabled className="font-semibold" size="small" />
            </Form.Item>
          </Col>
        )}
        <Col flex="140px">
          <Form.Item label="Ngày CT" required className="mb-0 w-full">
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
        <Col flex="160px">
          <Form.Item label="Loại GD" required className="mb-0 w-full">
            <Select
              placeholder="Chọn loại"
              disabled={isEditing}
              value={header?.loaiGiaoDich}
              onChange={handleLoaiGiaoDichChange}
              options={loaiGiaoDichOptions}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col flex="180px">
          <Form.Item label="Người GD" className="mb-0 w-full">
            <Input
              placeholder="Người giao dịch"
              value={header?.nguoiGiaoDich || ""}
              onChange={(e) => handleFieldChange("nguoiGiaoDich", e.target.value)}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col flex="180px">
          <Form.Item label="Địa chỉ" className="mb-0 w-full">
            <Input
              placeholder="Địa chỉ"
              value={header?.diaChi || ""}
              onChange={(e) => handleFieldChange("diaChi", e.target.value)}
              size="small"
            />
          </Form.Item>
        </Col>
        <Col flex="auto">
          <Form.Item label="Diễn giải chung" className="mb-0 w-full">
            <Input
              placeholder="Nhập diễn giải chung cho chứng từ"
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
