import { Module } from '@nestjs/common';
import { Tenant, User, UserCredential, UserTenant, VaiTro, PhanQuyen, Nganh, AppUserRole, TenantAppConfig } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantAdminGuard } from '@app/auth';

@Module({
  imports: [
    // Identity entities — no tenant filtering, separate DB (masterceo_identity)
    DatabaseModule.forFeatureIdentity([Tenant, User, UserCredential, UserTenant]),
    // RAW repos for SuperAdmin operations on digital_book entities
    DatabaseModule.forFeatureRaw([VaiTro, PhanQuyen, Nganh]),
    // Default connection repos (AppUserRole + TenantAppConfig are TENANT_EXEMPT, so no proxy)
    DatabaseModule.forFeature([AppUserRole, TenantAppConfig]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantAdminGuard],
  exports: [TenantService],
})
export class TenantModule {}
