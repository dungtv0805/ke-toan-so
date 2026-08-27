import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CauHinhKetChuyen, ChungTu, VoucherSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NhatKyChungModule } from '../nhat-ky-chung/nhat-ky-chung.module';
import { LoaiResolverModule, VoucherNumberService } from '../shared';
import { KetChuyenController } from './ket-chuyen.controller';
import { KetChuyenService } from './ket-chuyen.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forFeature([ChungTu, VoucherSequence, CauHinhKetChuyen]),
    TenantModule,
    NhatKyChungModule,
    LoaiResolverModule,
  ],
  controllers: [KetChuyenController],
  providers: [KetChuyenService, VoucherNumberService],
  exports: [KetChuyenService],
})
export class KetChuyenModule {}
