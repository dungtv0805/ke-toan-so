import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhanQuyen } from '@app/entities';
import { PhanQuyen_Service } from './phan-quyen.service';
import { PhanQuyen_Controller } from './phan-quyen.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PhanQuyen])],
  controllers: [PhanQuyen_Controller],
  providers: [PhanQuyen_Service],
  exports: [PhanQuyen_Service],
})
export class PhanQuyen_Module {}
