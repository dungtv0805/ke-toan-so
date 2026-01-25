import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhomKhoanMuc } from '@app/entities';
import { NhomKhoanMucController } from './nhom-khoan-muc.controller';
import { NhomKhoanMucService } from './nhom-khoan-muc.service';

@Module({
  imports: [TypeOrmModule.forFeature([NhomKhoanMuc])],
  controllers: [NhomKhoanMucController],
  providers: [NhomKhoanMucService],
  exports: [NhomKhoanMucService],
})
export class NhomKhoanMucModule {}
