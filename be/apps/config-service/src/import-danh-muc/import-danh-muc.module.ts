import { Module } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { QuyChuan_Module } from '../quy-chuan/quy-chuan.module';

@Module({
  imports: [QuyChuan_Module],
  controllers: [ImportDanhMucController],
  providers: [ImportDanhMucService],
})
export class ImportDanhMucModule {}
