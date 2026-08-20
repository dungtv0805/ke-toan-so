import { Module } from '@nestjs/common';
import { NhomSanPham } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomSanPhamService } from './nhom-san-pham.service';
import { NhomSanPhamController } from './nhom-san-pham.controller';

@Module({
  imports: [DatabaseModule.forFeature([NhomSanPham])],
  controllers: [NhomSanPhamController],
  providers: [NhomSanPhamService],
  exports: [NhomSanPhamService],
})
export class NhomSanPhamModule {}
