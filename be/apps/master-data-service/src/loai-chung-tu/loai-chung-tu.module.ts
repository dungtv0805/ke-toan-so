import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoaiChungTuMaster } from '@app/entities';
import { LoaiChungTuService } from './loai-chung-tu.service';
import { LoaiChungTuController } from './loai-chung-tu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoaiChungTuMaster])],
  controllers: [LoaiChungTuController],
  providers: [LoaiChungTuService],
  exports: [LoaiChungTuService],
})
export class LoaiChungTuModule {}
