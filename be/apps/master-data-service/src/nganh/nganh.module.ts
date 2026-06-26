import { Module } from '@nestjs/common';
import { Nganh, Tenant } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NganhController } from './nganh.controller';
import { NganhService } from './nganh.service';

@Module({
  imports: [DatabaseModule.forFeatureRaw([Nganh, Tenant])],
  controllers: [NganhController],
  providers: [NganhService],
  exports: [NganhService],
})
export class NganhModule {}
