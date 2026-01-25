import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserCredential } from '@app/entities';
import { NguoiDung_Controller } from './nguoi-dung.controller';
import { NguoiDung_Service } from './nguoi-dung.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCredential])],
  controllers: [NguoiDung_Controller],
  providers: [NguoiDung_Service],
  exports: [NguoiDung_Service],
})
export class NguoiDung_Module {}
