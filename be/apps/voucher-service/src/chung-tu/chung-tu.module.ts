import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, VoucherSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { ServiceClientModule } from '@app/service-client';
import { ChungTuService } from './chung-tu.service';
import { ChungTuController } from './chung-tu.controller';
import { VoucherNumberService, AccountValidationService, LoaiResolverModule } from '../shared';

@Module({
  imports: [ConfigModule, DatabaseModule.forFeature([ChungTu, VoucherSequence]), TenantModule, LoaiResolverModule, ServiceClientModule.forRoot()],
  controllers: [ChungTuController],
  providers: [ChungTuService, VoucherNumberService, AccountValidationService],
  exports: [ChungTuService],
})
export class ChungTuModule {}
