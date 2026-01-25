import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoiTuong } from '@app/entities';
import { DoiTuongService } from './doi-tuong.service';
import { DoiTuongController } from './doi-tuong.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DoiTuong])],
  controllers: [DoiTuongController],
  providers: [DoiTuongService],
  exports: [DoiTuongService],
})
export class DoiTuongModule {}
