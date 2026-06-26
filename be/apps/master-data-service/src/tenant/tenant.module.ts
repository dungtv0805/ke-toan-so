import { Module } from '@nestjs/common';
import { Tenant, User, UserCredential, UserTenant, VaiTro, PhanQuyen, Nganh } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantAdminGuard } from '@app/auth';

@Module({
  imports: [
    // Use forFeatureRaw to bypass tenant filtering for SuperAdmin operations
    DatabaseModule.forFeatureRaw([Tenant, User, UserCredential, UserTenant, VaiTro, PhanQuyen, Nganh]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantAdminGuard],
  exports: [TenantService],
})
export class TenantModule {}
