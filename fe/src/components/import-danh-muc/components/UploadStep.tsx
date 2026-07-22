import { Button, Upload, Space, Typography, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";
import type { ImportDanhMucConfig } from "../types";
import type { RefData } from "../lib/validate";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [config] = useImportState("config", null);
  const [parsing] = useImportState("parsing", false);
  const [loadingRefs] = useImportState("loadingRefs", false);
  const [refsLoaded] = useImportState("refsLoaded", false);
  const [refData] = useImportState("refData", {} as RefData);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  const handleDownload = () => {
    if (!config) return;
    downloadTemplate(
      config as ImportDanhMucConfig,
      (refData as RefData) ?? {},
    ).catch(() => {
      message.error("Không tạo được file mẫu");
    });
  };

  const requiredHeaders = config
    ? (config as ImportDanhMucConfig).columns
        .filter((c) => c.required)
        .map((c) => c.header)
        .join(", ")
    : "";

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button
          icon={<DownloadOutlined />}
          loading={loadingRefs}
          disabled={!refsLoaded || !config}
          onClick={handleDownload}
        >
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingRefs}
            disabled={loadingRefs || !refsLoaded}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        {`Mỗi dòng là 1 bản ghi. Cột bắt buộc: ${requiredHeaders}. Dòng có mã đã tồn tại sẽ báo lỗi và không được import. File còn lỗi thì không import được.`}
      </Text>
    </Space>
  );
}
