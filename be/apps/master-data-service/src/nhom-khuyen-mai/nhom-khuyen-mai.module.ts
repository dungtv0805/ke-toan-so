import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhomKhuyenMai } from '@app/entities';
import { NhomKhuyenMaiService } from './nhom-khuyen-mai.service';
import { NhomKhuyenMaiController } from './nhom-khuyen-mai.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NhomKhuyenMai])],
  controllers: [NhomKhuyenMaiController],
  providers: [NhomKhuyenMaiService],
  exports: [NhomKhuyenMaiService],
})
export class NhomKhuyenMaiModule {}
