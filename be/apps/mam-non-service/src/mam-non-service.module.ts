import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { DinhMucTienAnModule } from './dinh-muc-tien-an/dinh-muc-tien-an.module';
import { CongThucDinhLuongModule } from './cong-thuc-dinh-luong/cong-thuc-dinh-luong.module';
import { DiemDanhAnModule } from './diem-danh-an/diem-danh-an.module';
import { DeXuatMuaModule } from './de-xuat-mua/de-xuat-mua.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    DinhMucTienAnModule,
    CongThucDinhLuongModule,
    DiemDanhAnModule,
    DeXuatMuaModule,
  ],
})
export class MamNonServiceModule {}
