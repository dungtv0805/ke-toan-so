import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChuDauTu } from '@app/entities';
import { ChuDauTuService } from './chu-dau-tu.service';
import { ChuDauTuController } from './chu-dau-tu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChuDauTu])],
  controllers: [ChuDauTuController],
  providers: [ChuDauTuService],
  exports: [ChuDauTuService],
})
export class ChuDauTuModule {}
