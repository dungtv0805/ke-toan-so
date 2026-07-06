import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { DinhMucTienAnModule } from './dinh-muc-tien-an/dinh-muc-tien-an.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    DinhMucTienAnModule,
  ],
})
export class MamNonServiceModule {}
