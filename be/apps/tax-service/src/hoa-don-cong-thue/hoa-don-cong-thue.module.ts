import { Module } from '@nestjs/common';
import { CongTyCongThue, HoaDonCongThue } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { HoaDonCongThueService } from './hoa-don-cong-thue.service';
import { HoaDonCongThueController } from './hoa-don-cong-thue.controller';
import { PhienCongThueService } from './cong-thue/phien.service';
import { TaiHangLoatService } from './tai-hang-loat.service';
import { LichTaiService } from './lich-tai.service';

@Module({
  imports: [DatabaseModule.forFeature([CongTyCongThue, HoaDonCongThue])],
  controllers: [HoaDonCongThueController],
  providers: [HoaDonCongThueService, PhienCongThueService, TaiHangLoatService, LichTaiService],
  exports: [HoaDonCongThueService, TaiHangLoatService],
})
export class HoaDonCongThueModule {}
