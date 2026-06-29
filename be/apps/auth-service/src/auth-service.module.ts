import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { User, UserCredential, Tenant, UserTenant, PhanQuyen, AppUserRole, TenantAppConfig } from '@app/entities';

@Module({
  imports: [
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forRootIdentity(),
    DatabaseModule.forFeatureIdentity([User, UserCredential, Tenant, UserTenant]),
    DatabaseModule.forFeature([AppUserRole, TenantAppConfig]),
    DatabaseModule.forFeatureRaw([PhanQuyen]),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
