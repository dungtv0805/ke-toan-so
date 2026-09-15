import { Module } from '@nestjs/common';
import { CongTyCongThue, HoaDonCongThue } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { HoaDonCongThueService } from './hoa-don-cong-thue.service';
import { HoaDonCongThueController } from './hoa-don-cong-thue.controller';
import { PhienCongThueService } from './cong-thue/phien.service';
import { TaiHangLoatService } from './tai-hang-loat.service';
import { LichTaiService } from './lich-tai.service';
import { TaiFileGocService } from './tai-file-goc.service';

@Module({
  imports: [DatabaseModule.forFeature([CongTyCongThue, HoaDonCongThue])],
  controllers: [HoaDonCongThueController],
  providers: [HoaDonCongThueService, PhienCongThueService, TaiHangLoatService, LichTaiService, TaiFileGocService],
  exports: [HoaDonCongThueService, TaiHangLoatService],
})
export class HoaDonCongThueModule {}
