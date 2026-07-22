import { ServiceBase } from './base/service-base';
import type { ImportDanhMucConfig } from '@/components/import-danh-muc/types';

export interface ImportFailure {
  /** Số dòng trong file Excel. */
  row: number;
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
    const prefix = config.apiPrefix ?? '/master-data';
    return this.post<ImportApiResult>(
      { items },
      { endpoint: `${prefix}/import/${config.resource}` },
    );
  }
}

export const importDanhMucService = new ImportDanhMucService();
