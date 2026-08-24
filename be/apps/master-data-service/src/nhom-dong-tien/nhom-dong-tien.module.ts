import { Module } from '@nestjs/common';
import { NhomDongTien } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomDongTienController } from './nhom-dong-tien.controller';
import { NhomDongTienService } from './nhom-dong-tien.service';

@Module({
  imports: [DatabaseModule.forFeature([NhomDongTien])],
  controllers: [NhomDongTienController],
  providers: [NhomDongTienService],
  exports: [NhomDongTienService],
})
export class NhomDongTienModule {}
