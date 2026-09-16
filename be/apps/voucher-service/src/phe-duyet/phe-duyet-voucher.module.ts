import { Module } from '@nestjs/common';
import { TenantModule } from '@app/core';
import { PheDuyetClientService } from './phe-duyet-client.service';

/** Cầu nối sang engine phê duyệt (config-service) cho các module chứng từ. */
@Module({
  imports: [TenantModule],
  providers: [PheDuyetClientService],
  exports: [PheDuyetClientService],
})
export class PheDuyetVoucherModule {}
