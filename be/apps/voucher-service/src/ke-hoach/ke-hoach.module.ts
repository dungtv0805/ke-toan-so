import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, KeHoachDong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { KeHoachService } from './ke-hoach.service';
import { KeHoachController } from './ke-hoach.controller';

@Module({
  imports: [
    ConfigModule,
    // ChungTu để lấy số THỰC HIỆN cho báo cáo so sánh — cùng DB nên không cần gọi HTTP.
    DatabaseModule.forFeature([KeHoachDong, ChungTu]),
    TenantModule,
  ],
  controllers: [KeHoachController],
  providers: [KeHoachService],
  exports: [KeHoachService],
})
export class KeHoachModule {}
