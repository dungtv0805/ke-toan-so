import { useState } from "react";
import { Button } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { ImportDanhMucModal } from "./ImportDanhMucModal";
import type { ImportDanhMucConfig } from "./types";

export interface ImportDanhMucButtonProps {
  /** Cấu hình import của danh mục — truyền vào phải là hằng số cấp module (xem lưu ý ở types.ts),
   * vì hiệu ứng nạp dữ liệu tham chiếu trong modal phụ thuộc vào định danh của object này. */
  config: ImportDanhMucConfig;
  /** Quyền thêm mới của trang, lấy từ `usePagePermission` — nút chỉ hiển thị khi true. */
  canCreate: boolean;
  /** Gọi sau khi import tạo được bản ghi (kể cả import một phần) để trang cha nạp lại bảng. */
  onImported: () => void;
}

/**
 * Nút "Import Excel" gắn quyền `canCreate` + modal import, đóng gói toàn bộ phần dùng chung
 * mà mỗi trang danh mục trước đây phải tự viết (state đóng/mở, nút gate quyền, instance modal).
 * Trang chỉ cần render `<ImportDanhMucButton config={...} canCreate={canCreate} onImported={...} />`.
 */
export function ImportDanhMucButton({
  config,
  canCreate,
  onImported,
}: ImportDanhMucButtonProps) {
  const [open, setOpen] = useState(false);

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <Button icon={<FileExcelOutlined />} onClick={() => setOpen(true)}>
        Import Excel
      </Button>
      <ImportDanhMucModal
        open={open}
        config={config}
        onClose={() => setOpen(false)}
        onImported={onImported}
      />
    </>
  );
}
