import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  KeHoachBanHang,
  KeHoachDongTien,
  KeHoachNguonVon,
  KeHoachNhanSu,
  KeHoachTaiSan,
  KeHoachTonDau,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { KeHoachBanHangService } from './ban-hang/ban-hang.service';
import { KeHoachBanHangController } from './ban-hang/ban-hang.controller';
import { KeHoachNhanSuService } from './nhan-su/nhan-su.service';
import { KeHoachNhanSuController } from './nhan-su/nhan-su.controller';
import { KeHoachDongTienService } from './dong-tien/dong-tien.service';
import { KeHoachDongTienController } from './dong-tien/dong-tien.controller';
import { KeHoachTaiSanService } from './tai-san/tai-san.service';
import { KeHoachTaiSanController } from './tai-san/tai-san.controller';
import { KeHoachNguonVonService } from './nguon-von/nguon-von.service';
import { KeHoachNguonVonController } from './nguon-von/nguon-von.controller';

/**
 * Năm bảng nhập liệu của trang Kế hoạch: Bán hàng, Nhân sự, Dòng tiền, Tài sản,
 * Nguồn vốn.
 *
 * Tách khỏi `KeHoachModule` vì đó là lưới bút toán Nợ/Có, còn đây là bảng ma trận
 * 12 tháng. Phần dùng chung nằm ở `base/` và `helpers/`.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forFeature([
      KeHoachBanHang,
      KeHoachNhanSu,
      KeHoachDongTien,
      KeHoachTonDau,
      KeHoachTaiSan,
      KeHoachNguonVon,
    ]),
    TenantModule,
  ],
  controllers: [
    KeHoachBanHangController,
    KeHoachNhanSuController,
    KeHoachDongTienController,
    KeHoachTaiSanController,
    KeHoachNguonVonController,
  ],
  providers: [
    KeHoachBanHangService,
    KeHoachNhanSuService,
    KeHoachDongTienService,
    KeHoachTaiSanService,
    KeHoachNguonVonService,
  ],
  exports: [
    KeHoachBanHangService,
    KeHoachNhanSuService,
    KeHoachDongTienService,
    KeHoachTaiSanService,
    KeHoachNguonVonService,
  ],
})
export class KeHoachBangModule {}
