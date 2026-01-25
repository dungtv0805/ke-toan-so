import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaiKhoan } from '@app/entities';
import { TaiKhoanService } from './tai-khoan.service';
import { TaiKhoanController } from './tai-khoan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaiKhoan])],
  controllers: [TaiKhoanController],
  providers: [TaiKhoanService],
  exports: [TaiKhoanService],
})
export class TaiKhoanModule {}
