export interface ImportEntry {
  /** Service danh mục tương ứng — dùng lại logic create() sẵn có (check trùng, tenant scoping). */
  service: { create(dto: any): Promise<unknown> };
  /** Class DTO tạo mới của danh mục đó, dùng để validate từng dòng. */
  dtoClass: new () => object;
  /** Tên tiếng Việt, dùng trong thông báo lỗi. */
  label: string;
}

export interface ImportFailure {
  /**
   * Vị trí (0-based) của dòng lỗi trong mảng `items` mà FE gửi lên — KHÔNG phải số dòng
   * Excel. FE bỏ qua các dòng trống hoàn toàn khi đọc file nhưng vẫn giữ đúng rowNumber
   * gốc của các dòng còn lại, nên vị trí trong mảng đã gửi không còn khớp 1-1 với dòng
   * Excel nữa. Chỉ FE mới biết dòng Excel thật của từng phần tử nó đã gửi, nên việc quy
   * đổi index → rowNumber phải làm ở FE.
   */
  index: number;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: ImportFailure[];
}
