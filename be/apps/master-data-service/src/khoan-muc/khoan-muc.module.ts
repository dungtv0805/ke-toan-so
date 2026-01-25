import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KhoanMuc } from '@app/entities';
import { KhoanMucService } from './khoan-muc.service';
import { KhoanMucController } from './khoan-muc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KhoanMuc])],
  controllers: [KhoanMucController],
  providers: [KhoanMucService],
  exports: [KhoanMucService],
})
export class KhoanMucModule {}
