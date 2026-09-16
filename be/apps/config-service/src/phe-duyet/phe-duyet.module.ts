import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { StorageModule } from '@app/storage';
import {
  CauHinhPheDuyet,
  ChungTu,
  LichSuPheDuyet,
  QuyTrinhPheDuyet,
  ThongBao,
  VaiTro,
  ViTriPheDuyetNguoiDung,
} from '@app/entities';
import { CauHinhPheDuyetService } from './cau-hinh.service';
import { DongBoTrangThaiService } from './dong-bo-trang-thai.service';
import {
  PheDuyetController,
  ThongBaoController,
} from './phe-duyet.controller';
import { PheDuyetService } from './phe-duyet.service';
import { ThongBaoService } from './thong-bao.service';
import { TocDoService } from './toc-do.service';
import { ViTriPheDuyetService } from './vi-tri.service';

/**
 * Engine phê duyệt — đặt ở config-service vì danh mục Vị trí phân quyền
 * (`vai_tro`) và người dùng đã ở đây.
 *
 * `ChungTu` được đăng ký ở đây tuy nó thuộc voucher-service: các service dùng
 * chung một MongoDB, và engine cần ghi cột `trangThaiPheDuyet` xuống chứng từ
 * mỗi lần đổi trạng thái (xem `DongBoTrangThaiService`).
 */
@Module({
  imports: [
    DatabaseModule.forFeature([
      CauHinhPheDuyet,
      ViTriPheDuyetNguoiDung,
      QuyTrinhPheDuyet,
      LichSuPheDuyet,
      ThongBao,
      VaiTro,
      ChungTu,
    ]),
    // Bucket GridFS RIÊNG: file hồ sơ phê duyệt không lẫn với thư viện tài
    // liệu (`tai_lieu_files`) hay file hợp đồng.
    StorageModule.forBucket('phe_duyet_files'),
  ],
  controllers: [PheDuyetController, ThongBaoController],
  providers: [
    PheDuyetService,
    CauHinhPheDuyetService,
    ViTriPheDuyetService,
    ThongBaoService,
    TocDoService,
    DongBoTrangThaiService,
  ],
  exports: [PheDuyetService, CauHinhPheDuyetService],
})
export class PheDuyet_Module {}
