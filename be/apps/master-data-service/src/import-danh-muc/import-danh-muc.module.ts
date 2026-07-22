import { Module } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportDanhMucRegistry } from './import-danh-muc.registry';

import { TaiKhoanModule } from '../tai-khoan/tai-khoan.module';
import { DoiTuongModule } from '../doi-tuong/doi-tuong.module';
import { DuAnModule } from '../du-an/du-an.module';
import { SanPhamModule } from '../san-pham/san-pham.module';
import { HopDongModule } from '../hop-dong/hop-dong.module';
import { BoPhanModule } from '../bo-phan/bo-phan.module';
import { KhoanMucModule } from '../khoan-muc/khoan-muc.module';
import { KhoModule } from '../kho/kho.module';
import { HangHoaVatTuModule } from '../hang-hoa-vat-tu/hang-hoa-vat-tu.module';
import { DonViTinhModule } from '../don-vi-tinh/don-vi-tinh.module';
import { LyDoKhongHopLeModule } from '../ly-do-khong-hop-le/ly-do-khong-hop-le.module';
import { NhomVatTuModule } from '../nhom-vat-tu/nhom-vat-tu.module';
import { ChuDauTuModule } from '../chu-dau-tu/chu-dau-tu.module';
import { NhomKhoanMucModule } from '../nhom-khoan-muc/nhom-khoan-muc.module';
import { NganHangModule } from '../ngan-hang/ngan-hang.module';
import { DongTienModule } from '../dong-tien/dong-tien.module';
import { NhomKhuyenMaiModule } from '../nhom-khuyen-mai/nhom-khuyen-mai.module';
import { NhomQuanLyModule } from '../nhom-quan-ly/nhom-quan-ly.module';
import { LoaiChungTuModule } from '../loai-chung-tu/loai-chung-tu.module';
import { LoaiGiaoDichModule } from '../loai-giao-dich/loai-giao-dich.module';
import { HoSoChungTuModule } from '../ho-so-chung-tu/ho-so-chung-tu.module';

@Module({
  imports: [
    TaiKhoanModule,
    DoiTuongModule,
    DuAnModule,
    SanPhamModule,
    HopDongModule,
    BoPhanModule,
    KhoanMucModule,
    KhoModule,
    HangHoaVatTuModule,
    DonViTinhModule,
    LyDoKhongHopLeModule,
    NhomVatTuModule,
    ChuDauTuModule,
    NhomKhoanMucModule,
    NganHangModule,
    DongTienModule,
    NhomKhuyenMaiModule,
    NhomQuanLyModule,
    LoaiChungTuModule,
    LoaiGiaoDichModule,
    HoSoChungTuModule,
  ],
  controllers: [ImportDanhMucController],
  providers: [ImportDanhMucService, ImportDanhMucRegistry],
})
export class ImportDanhMucModule {}
