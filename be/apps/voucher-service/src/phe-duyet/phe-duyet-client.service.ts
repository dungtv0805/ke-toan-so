import { Injectable, Logger } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import { RequestContext, TenantContextService } from '@app/core';
import type { ChungTu } from '@app/entities';

/**
 * Cầu nối từ voucher-service sang engine phê duyệt ở config-service.
 *
 * Chỉ hai việc: báo "chứng từ vừa bị sửa" (mục 11) và gửi phê duyệt hộ màn
 * chứng từ (mục 5 bước 2). Mọi quyết định về luồng nằm bên engine.
 */
@Injectable()
export class PheDuyetClientService {
  private readonly logger = new Logger(PheDuyetClientService.name);

  constructor(
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {};
    const req = RequestContext.getRequest();
    const auth = req?.headers?.authorization;
    if (auth) h['Authorization'] = auth;

    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) h['x-tenant-id'] = tenantId;

    const userId = this.tenantContext.getCurrentUserId();
    if (userId) h['x-user-id'] = userId;

    return h;
  }

  /**
   * Báo engine rằng chứng từ vừa đổi nội dung — mục 11.
   *
   * Nuốt lỗi có chủ đích: chứng từ ĐÃ được lưu rồi, ném lỗi ở đây chỉ làm người
   * dùng tưởng lưu hỏng và bấm lưu lại. Lỗi được ghi log để dò; trạng thái
   * lệch không làm số liệu sai lệch theo hướng nguy hiểm — chứng từ giữ nguyên
   * trạng thái CŨ (đã duyệt), không phải trạng thái lỏng hơn.
   */
  async baoDaSua(
    doiTuongId: string,
    truoc: Partial<ChungTu>,
    sau: Partial<ChungTu>,
  ): Promise<void> {
    const res = await this.serviceClient.post('config', '/phe-duyet/sau-khi-sua', {
      headers: this.headers(),
      body: { loaiDoiTuong: 'CHUNG_TU', doiTuongId, truoc, sau },
    });

    if (!res.success) {
      this.logger.error(
        `Không báo được thay đổi chứng từ ${doiTuongId} sang engine phê duyệt: ${JSON.stringify(res.error)}`,
      );
    }
  }
}
