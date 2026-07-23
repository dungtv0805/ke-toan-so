import React, { useState } from "react";
import { Button, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { exportToExcel, ExcelColumn } from "@/utils/exportExcel";

export interface ExportDanhMucConfig {
  fileName: string;
  sheetName: string;
  title: string;
  columns: ExcelColumn[];
  fetchData: () => Promise<Record<string, string | number | undefined | null>[]>;
}

interface ExportDanhMucButtonProps {
  config: ExportDanhMucConfig;
  canExport: boolean;
}

export const ExportDanhMucButton: React.FC<ExportDanhMucButtonProps> = ({
  config,
  canExport,
}) => {
  const [loading, setLoading] = useState(false);

  if (!canExport) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await config.fetchData();
      if (data.length === 0) {
        message.warning("Không có dữ liệu để xuất");
        return;
      }
      exportToExcel({
        title: config.title,
        columns: config.columns,
        data,
        fileName: config.fileName,
        sheetName: config.sheetName,
      });
      message.success(`Đã xuất ${data.length} dòng ra file Excel`);
    } catch (error) {
      console.error("Export failed:", error);
      message.error("Xuất Excel thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button icon={<ExportOutlined />} loading={loading} onClick={handleExport}>
      Xuất Excel
    </Button>
  );
};
