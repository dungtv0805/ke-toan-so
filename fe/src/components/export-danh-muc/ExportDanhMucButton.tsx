import React, { useState } from "react";
import { Button, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { exportToExcel, ExcelColumn, ExcelRow } from "@/utils/exportExcel";
import { gomTheoNhom, type MucNhom } from "@/components/table/bang-cay";

/**
 * Cấu hình gom nhóm cho file Excel — cùng bộ khoá/nhãn với cây trên màn hình,
 * nên dùng chung `gomTheoNhom`: thứ tự nhóm, nhóm "lạ" xếp cuối và nhãn nhóm
 * trống đều khớp với thứ người dùng vừa nhìn thấy.
 */
export interface ExportDanhMucGroup {
  /** Mã nhóm của một DÒNG ĐÃ MAP (không phải bản ghi gốc). */
  layMa: (row: ExcelRow) => string | undefined | null;
  /** Danh mục nhóm — quyết định tên và thứ tự nhóm. */
  danhMuc: readonly MucNhom[];
  /** Đơn vị đếm trên dòng tiêu đề nhóm, vd "sản phẩm". */
  donVi: string;
  nhanTrong?: string;
  /** Cột bỏ khỏi file khi đã gom nhóm — nhóm đã nằm trên dòng tiêu đề rồi. */
  boCot?: readonly string[];
}

export interface ExportDanhMucConfig {
  fileName: string;
  sheetName: string;
  title: string;
  columns: ExcelColumn[];
  fetchData: () => Promise<ExcelRow[]>;
  /** Có thì file xuất ra ở dạng cây 2 cấp; không có thì xuất phẳng như cũ. */
  group?: ExportDanhMucGroup;
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
      const { group } = config;
      const columns = group?.boCot?.length
        ? config.columns.filter((c) => !group.boCot?.includes(c.dataKey))
        : config.columns;
      const groups = group
        ? gomTheoNhom(data, {
            layMa: group.layMa,
            danhMuc: group.danhMuc,
            nhanTrong: group.nhanTrong,
          }).map((n) => ({ ten: n.ten, soLuong: n.soLuong, rows: n.children }))
        : undefined;
      exportToExcel({
        title: config.title,
        columns,
        data,
        groups,
        donVi: group?.donVi,
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
