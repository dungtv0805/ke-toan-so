import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { QuyChuan_Module } from './quy-chuan/quy-chuan.module';
import { PhanQuyen_Module } from './phan-quyen/phan-quyen.module';
import { NguoiDung_Module } from './nguoi-dung/nguoi-dung.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    QuyChuan_Module,
    PhanQuyen_Module,
    NguoiDung_Module,
  ],
})
export class ConfigServiceModule {}
