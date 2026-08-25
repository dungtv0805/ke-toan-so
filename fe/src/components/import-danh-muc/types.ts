/**
 * Ràng buộc tối thiểu cho một bản ghi danh mục tham chiếu.
 * KHÔNG khai index signature: các interface thật (DuAn, DonViTinh, ChuDauTu...) không có
 * index signature, nên nếu thêm vào đây thì không service nào gán được và cả 22 file config
 * sẽ phải cast.
 */
export interface RefItem {
  id?: string;
}

/**
 * Bản ghi tham chiếu ở dạng đọc được mọi trường. Chỉ dùng bên trong lib (khi dò mã)
 * và ở tham số của `assign`, để config viết thẳng `found.ma`, `found.ten`.
 */
export type RefRecord = RefItem & Record<string, unknown>;

/** Phần duy nhất của một service danh mục mà module import cần đến. */
export interface RefSource {
  getAll(): Promise<RefItem[]>;
}

interface RefSpecBase {
  /** Service của danh mục được tham chiếu. */
  service: RefSource;
  /** Trường dùng để dò khớp với giá trị trong ô Excel, thường là "ma". */
  matchBy: string;
  /** Tên hiển thị trong thông báo lỗi, ví dụ "Chủ đầu tư". */
  label: string;
  /** Trường hiển thị kèm mã trong danh sách thả xuống của file mẫu. */
  displayField?: string;
}

/** Cột tham chiếu một giá trị — trường hợp phổ biến. */
export interface SingleRefSpec extends RefSpecBase {
  multi?: false;
  /** Ánh xạ bản ghi dò được → các trường của DTO gửi lên BE. */
  assign: (found: RefRecord) => Record<string, unknown>;
}

/** Cột tham chiếu nhiều giá trị, ngăn cách bằng dấu phẩy trong ô Excel. */
export interface MultiRefSpec extends RefSpecBase {
  multi: true;
  assign: (found: RefRecord[]) => Record<string, unknown>;
}

/**
 * Union phân biệt theo `multi`, nhờ đó `assign` của cột một-giá-trị nhận thẳng
 * một bản ghi chứ không phải `RefRecord | RefRecord[]` rồi phải tự thu hẹp kiểu.
 */
export type RefSpec = SingleRefSpec | MultiRefSpec;

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
  /**
   * Tiêu đề cũ vẫn chấp nhận khi ĐỌC file (không ghi vào file mẫu). Dùng khi đổi tên
   * một cột: file người dùng đã tải về từ bản trước vẫn nhập được, không bị báo thiếu cột.
   */
  headerAliases?: string[];
  required?: boolean;
  type?: ImportColumnType;
  /**
   * Bắt buộc khi type là 'enum' hoặc 'enumList'. Excel nhận cả label lẫn value.
   * `aliases` là các nhãn cũ vẫn chấp nhận khi đọc file (không hiện ở dropdown mẫu),
   * để file người dùng lưu từ bản trước không hỏng khi đổi tên nhãn.
   */
  enumValues?: { label: string; value: string; aliases?: string[] }[];
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
  service: RefSource;
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
  /** Payload gửi lên BE; null nếu dòng có lỗi HOẶC dòng đã được tạo (created === true). */
  payload: Record<string, unknown> | null;
  /**
   * Dòng này đã được BE tạo thành công ở lần import trước (một phần của kết quả "partial") —
   * KHÔNG phải "Hợp lệ, chưa import" (đã gửi rồi) và cũng KHÔNG phải "Lỗi". Preview phải hiển
   * thị trạng thái riêng để người dùng biết chính xác dòng nào cần xoá khỏi file trước khi sửa
   * các dòng lỗi và tải lại — tránh tạo trùng và tránh hiểu nhầm "phải làm lại từ đầu".
   */
  created?: boolean;
}

export interface ValidateOutcome {
  results: RowValidationResult[];
  validItems: Record<string, unknown>[];
  hasErrors: boolean;
}
