import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoaiGiaoDich } from '@app/entities';
import { LoaiGiaoDichService } from './loai-giao-dich.service';
import { LoaiGiaoDichController } from './loai-giao-dich.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoaiGiaoDich])],
  controllers: [LoaiGiaoDichController],
  providers: [LoaiGiaoDichService],
  exports: [LoaiGiaoDichService],
})
export class LoaiGiaoDichModule {}
