import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuyChuan } from '@app/entities';
import { QuyChuan_Service } from './quy-chuan.service';
import { QuyChuan_Controller } from './quy-chuan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuyChuan])],
  controllers: [QuyChuan_Controller],
  providers: [QuyChuan_Service],
  exports: [QuyChuan_Service],
})
export class QuyChuan_Module {}
