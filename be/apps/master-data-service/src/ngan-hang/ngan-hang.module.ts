import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NganHang } from '@app/entities';
import { NganHangService } from './ngan-hang.service';
import { NganHangController } from './ngan-hang.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NganHang])],
  controllers: [NganHangController],
  providers: [NganHangService],
  exports: [NganHangService],
})
export class NganHangModule {}
