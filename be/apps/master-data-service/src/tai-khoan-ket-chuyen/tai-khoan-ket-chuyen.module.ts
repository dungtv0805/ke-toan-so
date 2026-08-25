import { Module } from '@nestjs/common';
import { TaiKhoanKetChuyen } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TaiKhoanKetChuyenController } from './tai-khoan-ket-chuyen.controller';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';

@Module({
  imports: [DatabaseModule.forFeature([TaiKhoanKetChuyen])],
  controllers: [TaiKhoanKetChuyenController],
  providers: [TaiKhoanKetChuyenService],
  exports: [TaiKhoanKetChuyenService],
})
export class TaiKhoanKetChuyenModule {}
