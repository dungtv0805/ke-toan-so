import { Button, Upload, Space, Typography } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [parsing] = useImportState("parsing", false);
  const [loadingMasterData] = useImportState("loadingMasterData", false);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingMasterData}
            disabled={loadingMasterData}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        Mỗi dòng = 1 chứng từ. Cột 1–6 bắt buộc. Khớp danh mục theo mã. File còn lỗi sẽ không import được.
      </Text>
    </Space>
  );
}
