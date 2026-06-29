import { Module } from '@nestjs/common';
import { User, UserCredential, UserTenant, AppUserRole } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NguoiDung_Controller } from './nguoi-dung.controller';
import { NguoiDung_Service } from './nguoi-dung.service';

@Module({
  imports: [
    // Identity entities (User, UserCredential, UserTenant) read/write from masterceo_identity
    DatabaseModule.forFeatureIdentity([User, UserCredential, UserTenant]),
    // Functional role entity lives in digital_book (default connection)
    DatabaseModule.forFeature([AppUserRole]),
    TenantModule,
  ],
  controllers: [NguoiDung_Controller],
  providers: [NguoiDung_Service],
  exports: [NguoiDung_Service],
})
export class NguoiDung_Module {}
