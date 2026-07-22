import { Table, Tag, Alert } from "antd";
import { useImportState } from "../ImportHandlerContext";
import type { RowValidationResult } from "../types";

export function PreviewTable() {
  const [results] = useImportState("results", [] as RowValidationResult[]);
  const [parsed] = useImportState("parsed", false);

  if (!parsed) return null;

  const rows = results ?? [];
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const createdCount = rows.filter((r) => r.created === true).length;
  const okCount = rows.length - errorCount - createdCount;

  const columns = [
    { title: "Dòng", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length > 0 ? (
          <Tag color="red">Lỗi</Tag>
        ) : r.created ? (
          <Tag color="blue">Đã tạo</Tag>
        ) : (
          <Tag color="green">Hợp lệ</Tag>
        ),
    },
    { title: "Dữ liệu", dataIndex: "display", key: "display", width: 260 },
    {
      title: "Lỗi",
      key: "errors",
      render: (_: unknown, r: RowValidationResult) => {
        if (r.errors.length > 0) {
          return (
            <div>
              {r.errors.map((e, i) => (
                <div key={i} style={{ color: "#cf1322" }}>
                  • {e}
                </div>
              ))}
            </div>
          );
        }
        if (r.created) {
          return <span style={{ color: "#1677ff" }}>Đã tạo ở lần import trước</span>;
        }
        return <span style={{ color: "#389e0d" }}>OK</span>;
      },
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={errorCount > 0 ? "error" : createdCount > 0 ? "warning" : "success"}
        showIcon
        message={
          createdCount > 0
            ? `Hợp lệ: ${okCount} • Đã tạo: ${createdCount} • Lỗi: ${errorCount}`
            : `Hợp lệ: ${okCount} • Lỗi: ${errorCount}`
        }
        description={
          createdCount > 0
            ? errorCount > 0
              ? `${createdCount} dòng đã được tạo thành công ở lần import trước (đánh dấu "Đã tạo"). Vui lòng xoá đúng ${createdCount} dòng này khỏi file Excel, sửa các dòng còn lỗi rồi tải lại — nếu giữ nguyên, các dòng này sẽ báo "Mã đã tồn tại trong hệ thống" khi import lại.`
              : `${createdCount} dòng đã được tạo thành công. Có thể đóng hộp thoại này.`
            : undefined
        }
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
