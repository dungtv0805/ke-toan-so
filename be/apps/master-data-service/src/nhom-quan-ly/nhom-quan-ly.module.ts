import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhomQuanLy } from '@app/entities';
import { NhomQuanLyService } from './nhom-quan-ly.service';
import { NhomQuanLyController } from './nhom-quan-ly.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NhomQuanLy])],
  controllers: [NhomQuanLyController],
  providers: [NhomQuanLyService],
  exports: [NhomQuanLyService],
})
export class NhomQuanLyModule {}
