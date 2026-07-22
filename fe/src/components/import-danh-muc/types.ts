/** Một bản ghi danh mục tham chiếu (kết quả getAll của service khác). */
export interface RefItem {
  id?: string;
  [key: string]: unknown;
}

export interface RefSpec {
  /** Service của danh mục được tham chiếu. */
  service: { getAll(): Promise<RefItem[]> };
  /** Trường dùng để dò khớp với giá trị trong ô Excel, thường là "ma". */
  matchBy: string;
  /** Tên hiển thị trong thông báo lỗi, ví dụ "Chủ đầu tư". */
  label: string;
  /** Trường hiển thị kèm mã trong danh sách thả xuống của file mẫu. */
  displayField?: string;
  /** Cho phép nhiều giá trị ngăn cách bằng dấu phẩy. */
  multi?: boolean;
  /**
   * Ánh xạ bản ghi dò được → các trường của DTO gửi lên BE.
   * Với `multi: true`, tham số là mảng các bản ghi dò được.
   */
  assign: (found: RefItem | RefItem[]) => Record<string, unknown>;
}

export type ImportColumnType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'enumList';

export interface ImportColumn {
  /** Định danh cột. Nếu không có `ref`, đây cũng là tên trường trong DTO. */
  key: string;
  /** Tiêu đề cột trong file Excel — dùng để dò header, phải khớp chính xác. */
  header: string;
  required?: boolean;
  type?: ImportColumnType;
  /** Bắt buộc khi type là 'enum' hoặc 'enumList'. Excel nhận cả label lẫn value. */
  enumValues?: { label: string; value: string }[];
  ref?: RefSpec;
  /** Giá trị mẫu ghi vào dòng ví dụ của file template. */
  example?: string;
}

export interface ImportDanhMucConfig {
  /** Tên danh mục, dùng cho tiêu đề modal và tên file mẫu. */
  title: string;
  /** Đoạn cuối URL import, khớp với registry phía BE. */
  resource: string;
  /** Mặc định '/master-data'. Quy chuẩn hạch toán dùng '/config'. */
  apiPrefix?: string;
  /** Service của chính danh mục này — dùng để lấy dữ liệu hiện có mà dò trùng. */
  service: { getAll(): Promise<RefItem[]> };
  /** Các key tạo nên khóa trùng. Hầu hết là ['ma']; Quy chuẩn là ['loaiGiaoDich','nghiepVu']. */
  uniqueBy: string[];
  columns: ImportColumn[];
}

/** Một dòng đọc từ sheet, giá trị đã trim về chuỗi (trừ ô ngày dạng serial). */
export interface RawImportRow {
  /** Số dòng theo Excel (1-based, dòng 1 là header). */
  rowNumber: number;
  values: Record<string, string | number>;
}

export interface RowValidationResult {
  rowNumber: number;
  /** Giá trị hiển thị lại trên bảng preview (2 cột đầu của config). */
  display: string;
  errors: string[];
  /** Payload gửi lên BE; null nếu dòng có lỗi. */
  payload: Record<string, unknown> | null;
}

export interface ValidateOutcome {
  results: RowValidationResult[];
  validItems: Record<string, unknown>[];
  hasErrors: boolean;
}
