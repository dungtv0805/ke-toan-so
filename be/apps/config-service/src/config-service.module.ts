import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { QuyChuan_Module } from './quy-chuan/quy-chuan.module';
import { PhanQuyen_Module } from './phan-quyen/phan-quyen.module';
import { NguoiDung_Module } from './nguoi-dung/nguoi-dung.module';
import { VaiTro_Module } from './vai-tro/vai-tro.module';
import { PhieuTemplate_Module } from './phieu-template/phieu-template.module';
import { TaiLieu_Module } from './tai-lieu/tai-lieu.module';
import { ImportDanhMucModule } from './import-danh-muc/import-danh-muc.module';
import { PheDuyet_Module } from './phe-duyet/phe-duyet.module';
import { KhoaSo_Module } from './khoa-so/khoa-so.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    QuyChuan_Module,
    PhanQuyen_Module,
    NguoiDung_Module,
    VaiTro_Module,
    PhieuTemplate_Module,
    TaiLieu_Module,
    ImportDanhMucModule,
    PheDuyet_Module,
    KhoaSo_Module,
  ],
})
export class ConfigServiceModule {}
