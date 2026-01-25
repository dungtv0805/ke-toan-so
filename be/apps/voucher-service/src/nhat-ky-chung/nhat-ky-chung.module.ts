import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, VoucherSequence } from '@app/entities';
import { NhatKyChungService } from './nhat-ky-chung.service';
import { NhatKyChungController } from './nhat-ky-chung.controller';
import { VoucherNumberService } from '../shared';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ChungTu, VoucherSequence])],
  controllers: [NhatKyChungController],
  providers: [NhatKyChungService, VoucherNumberService],
  exports: [NhatKyChungService],
})
export class NhatKyChungModule {}
