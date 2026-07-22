export interface ImportEntry {
  /** Service danh mục tương ứng — dùng lại logic create() sẵn có (check trùng, tenant scoping). */
  service: { create(dto: any): Promise<unknown> };
  /** Class DTO tạo mới của danh mục đó, dùng để validate từng dòng. */
  dtoClass: new () => object;
  /** Tên tiếng Việt, dùng trong thông báo lỗi. */
  label: string;
}

export interface ImportFailure {
  /** Số dòng trong file Excel (1-based, đã gồm dòng header). */
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: ImportFailure[];
}
