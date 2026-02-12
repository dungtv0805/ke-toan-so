import { Module } from '@nestjs/common';
import { Tenant, User, UserCredential, UserTenant } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

@Module({
  imports: [
    // Use forFeatureRaw to bypass tenant filtering for SuperAdmin operations
    DatabaseModule.forFeatureRaw([Tenant, User, UserCredential, UserTenant]),
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
