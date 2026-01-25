import {
  Form,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
  Collapse,
} from "antd";
import { DownOutlined } from "@ant-design/icons";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";
import { LoaiChungTuType } from "@/services/loaiChungTuService";
import { ChungTuHeader } from "../../form-handler/sub-handler/init/init.state";

export function FormHeader() {
  const handler = useNhatKyChungFormHandler();
  const [header] = useNhatKyChungFormState("header", null);
  const [isEditing] = useNhatKyChungFormState("isEditing", false);
  const [loaiChungTuList] = useNhatKyChungFormState("loaiChungTuList", []);

  const handleFieldChange = (field: keyof ChungTuHeader, value: unknown) => {
    handler.executeEvent("updateHeader", { field, value });
  };

  const handleLoaiChange = (value: string) => {
    handler.executeEvent("handleLoaiChange", { loaiMa: value });
  };

  return (
    <div className="mb-4 sm:mb-6">
      <Row gutter={[16, 8]}>
        {isEditing && header?.soPhieu && (
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Số phiếu" className="mb-2 sm:mb-3">
              <Input value={header.soPhieu} disabled className="font-semibold" />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} sm={12} md={isEditing ? 6 : 8}>
          <Form.Item
            label="Ngày chứng từ"
            required
            className="mb-2 sm:mb-3"
            validateStatus={!header?.ngay ? "error" : ""}
            help={!header?.ngay ? "Vui lòng chọn ngày" : ""}
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
        <Col xs={24} sm={24} md={isEditing ? 12 : 16}>
          <Form.Item
            label="Nghiệp vụ"
            required
            className="mb-2 sm:mb-3"
            validateStatus={!header?.loai ? "error" : ""}
            help={!header?.loai ? "Vui lòng chọn nghiệp vụ" : ""}
          >
            <Select
              showSearch
              placeholder="Chọn nghiệp vụ"
              disabled={isEditing}
              optionFilterProp="label"
              value={header?.loai}
              onChange={handleLoaiChange}
              options={(loaiChungTuList as LoaiChungTuType[])?.map((lct) => ({
                value: lct.ma,
                label: lct.ten,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Diễn giải chung" className="mb-2 sm:mb-3">
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="Nhập diễn giải chung cho chứng từ"
          value={header?.dienGiaiChung || ""}
          onChange={(e) => handleFieldChange("dienGiaiChung", e.target.value)}
        />
      </Form.Item>

      <Collapse
        ghost
        expandIcon={({ isActive }) => (
          <DownOutlined rotate={isActive ? 180 : 0} />
        )}
        items={[
          {
            key: "extra",
            label: (
              <span className="text-gray-500 text-sm">Thông tin bổ sung</span>
            ),
            children: (
              <>
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12}>
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
                  <Col xs={24} sm={12}>
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
                <Form.Item label="Ghi chú" className="mb-0">
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="Nhập ghi chú (nếu có)"
                    value={header?.ghiChu || ""}
                    onChange={(e) =>
                      handleFieldChange("ghiChu", e.target.value)
                    }
                  />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
