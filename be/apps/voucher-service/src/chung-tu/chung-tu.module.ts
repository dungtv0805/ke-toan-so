import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, VoucherSequence } from '@app/entities';
import { ChungTuService } from './chung-tu.service';
import { ChungTuController } from './chung-tu.controller';
import { VoucherNumberService, AccountValidationService } from '../shared';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ChungTu, VoucherSequence])],
  controllers: [ChungTuController],
  providers: [ChungTuService, VoucherNumberService, AccountValidationService],
  exports: [ChungTuService],
})
export class ChungTuModule {}
