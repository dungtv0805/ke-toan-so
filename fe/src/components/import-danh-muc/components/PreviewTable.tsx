import { Table, Tag, Alert } from "antd";
import { useImportState } from "../ImportHandlerContext";
import type { RowValidationResult } from "../types";

export function PreviewTable() {
  const [results] = useImportState("results", [] as RowValidationResult[]);
  const [parsed] = useImportState("parsed", false);

  if (!parsed) return null;

  const rows = results ?? [];
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const okCount = rows.length - errorCount;

  const columns = [
    { title: "Dòng", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length > 0 ? (
          <Tag color="red">Lỗi</Tag>
        ) : (
          <Tag color="green">Hợp lệ</Tag>
        ),
    },
    { title: "Dữ liệu", dataIndex: "display", key: "display", width: 260 },
    {
      title: "Lỗi",
      key: "errors",
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length === 0 ? (
          <span style={{ color: "#389e0d" }}>OK</span>
        ) : (
          <div>
            {r.errors.map((e, i) => (
              <div key={i} style={{ color: "#cf1322" }}>
                • {e}
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={errorCount > 0 ? "error" : "success"}
        showIcon
        message={`Hợp lệ: ${okCount} • Lỗi: ${errorCount}`}
        style={{ marginBottom: 12 }}
      />
      <Table
        size="small"
        rowKey="rowNumber"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ y: 360 }}
      />
    </div>
  );
}
