import { Module } from '@nestjs/common';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { TaiKhoanModule } from './tai-khoan/tai-khoan.module';
import { DoiTuongModule } from './doi-tuong/doi-tuong.module';
import { DuAnModule } from './du-an/du-an.module';
import { BoPhanModule } from './bo-phan/bo-phan.module';
import { SanPhamModule } from './san-pham/san-pham.module';
import { KhoanMucModule } from './khoan-muc/khoan-muc.module';
import { NganHangModule } from './ngan-hang/ngan-hang.module';
import { DongTienModule } from './dong-tien/dong-tien.module';
import { ChuDauTuModule } from './chu-dau-tu/chu-dau-tu.module';
import { NhomKhuyenMaiModule } from './nhom-khuyen-mai/nhom-khuyen-mai.module';
import { NhomQuanLyModule } from './nhom-quan-ly/nhom-quan-ly.module';
import { LoaiChungTuModule } from './loai-chung-tu/loai-chung-tu.module';
import { NhomKhoanMucModule } from './nhom-khoan-muc/nhom-khoan-muc.module';
import { LoaiGiaoDichModule } from './loai-giao-dich/loai-giao-dich.module';
import { HopDongModule } from './hop-dong/hop-dong.module';
import {
  TaiKhoan,
  DoiTuong,
  DuAn,
  BoPhan,
  SanPham,
  KhoanMuc,
  NganHang,
  DongTien,
  ChuDauTu,
  NhomKhuyenMai,
  NhomQuanLy,
  LoaiChungTuMaster,
  NhomKhoanMuc,
  LoaiGiaoDich,
  HopDong,
} from '@app/entities';

@Module({
  imports: [
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeature([
      TaiKhoan,
      DoiTuong,
      DuAn,
      BoPhan,
      SanPham,
      KhoanMuc,
      NganHang,
      DongTien,
      ChuDauTu,
      NhomKhuyenMai,
      NhomQuanLy,
      LoaiChungTuMaster,
      NhomKhoanMuc,
      LoaiGiaoDich,
      HopDong,
    ]),
    TaiKhoanModule,
    DoiTuongModule,
    DuAnModule,
    BoPhanModule,
    SanPhamModule,
    KhoanMucModule,
    NganHangModule,
    DongTienModule,
    ChuDauTuModule,
    NhomKhuyenMaiModule,
    NhomQuanLyModule,
    LoaiChungTuModule,
    NhomKhoanMucModule,
    LoaiGiaoDichModule,
    HopDongModule,
  ],
})
export class MasterDataServiceModule {}
