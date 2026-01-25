import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DongTien } from '@app/entities';
import { DongTienService } from './dong-tien.service';
import { DongTienController } from './dong-tien.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DongTien])],
  controllers: [DongTienController],
  providers: [DongTienService],
  exports: [DongTienService],
})
export class DongTienModule {}
