import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeHoachBanHang, KeHoachNhanSu } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { KeHoachBanHangService } from './ban-hang/ban-hang.service';
import { KeHoachBanHangController } from './ban-hang/ban-hang.controller';
import { KeHoachNhanSuService } from './nhan-su/nhan-su.service';
import { KeHoachNhanSuController } from './nhan-su/nhan-su.controller';

/**
 * Hai bảng nhập liệu Bán hàng và Nhân sự của trang Kế hoạch.
 * Tách khỏi `KeHoachModule` vì đó là lưới bút toán Nợ/Có, còn đây là bảng ma trận.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forFeature([KeHoachBanHang, KeHoachNhanSu]),
    TenantModule,
  ],
  controllers: [KeHoachBanHangController, KeHoachNhanSuController],
  providers: [KeHoachBanHangService, KeHoachNhanSuService],
  exports: [KeHoachBanHangService, KeHoachNhanSuService],
})
export class KeHoachBangModule {}
