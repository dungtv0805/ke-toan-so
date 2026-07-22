import { ServiceBase } from './base/service-base';
import type { ImportDanhMucConfig } from '@/components/import-danh-muc/types';

/**
 * Import cho phép tới 2000 dòng, ghi tuần tự từng dòng ở BE (không index trên các entity
 * danh mục) — có thể mất hơn 30s (timeout mặc định của mọi request khác). 5 phút đủ dư cho
 * cả lô tối đa mà không phải chờ vô hạn nếu server thực sự treo.
 */
const IMPORT_TIMEOUT_MS = 5 * 60 * 1000;

export interface ImportFailure {
  /**
   * Vị trí (0-based) của dòng lỗi trong mảng `items` đã gửi lên BE — KHÔNG phải số dòng
   * Excel. BE không biết dòng Excel thật của từng phần tử (đã bỏ qua dòng trống khi đọc file),
   * nên FE phải tự quy đổi index → rowNumber dựa trên danh sách dòng nó đã gửi.
   */
  index: number;
  message: string;
}

export interface ImportApiResult {
  created: number;
  failed: ImportFailure[];
}

/**
 * Gọi endpoint import dùng chung. Endpoint đầy đủ là
 * `{apiPrefix}/import/{resource}` — apiPrefix mặc định '/master-data',
 * riêng Quy chuẩn hạch toán là '/config'.
 */
class ImportDanhMucService extends ServiceBase {
  constructor() {
    super({ endpoint: '' });
  }

  async importItems(
    config: ImportDanhMucConfig,
    items: Record<string, unknown>[],
  ): Promise<ImportApiResult> {
    const prefix = config.apiPrefix || '/master-data';
    return this.post<ImportApiResult>(
      { items },
      {
        endpoint: `${prefix}/import/${config.resource}`,
        // BE ghi từng dòng tuần tự (cố ý, để dò trùng trong-lô đúng) và không có index
        // trên các entity danh mục, nên vài trăm dòng có thể vượt xa timeout mặc định
        // (API_CONFIG.TIMEOUT = 30s) trong khi server vẫn đang ghi tiếp. Timeout riêng,
        // dài hơn hẳn, chỉ cho request này — không đổi mặc định chung của toàn app.
        timeout: IMPORT_TIMEOUT_MS,
      },
    );
  }
}

export const importDanhMucService = new ImportDanhMucService();
