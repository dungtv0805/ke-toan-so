import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { KetQuaXuLy, LoaiDoiTuongPheDuyet } from './trang-thai';

/**
 * Lịch sử phê duyệt — đúng bộ trường bảng mục 14. CHỈ GHI THÊM, không bao giờ
 * sửa/xoá: sửa nội dung trọng yếu rồi duyệt lại (mục 11) sinh dòng mới, vết cũ
 * vẫn còn để truy được ai đã duyệt phiên bản nào.
 *
 * `quy_trinh_phe_duyet.buoc` giữ TRẠNG THÁI HIỆN TẠI (để render nhanh), bảng
 * này giữ DÒNG THỜI GIAN. Hai thứ khác nhau, đừng gộp.
 */
@Entity('lich_su_phe_duyet')
@Index('IDX_lich_su_quy_trinh', ['tenantId', 'quyTrinhId'])
@Index('IDX_lich_su_doi_tuong', ['tenantId', 'loaiDoiTuong', 'doiTuongId'])
export class LichSuPheDuyet extends BaseEntity {
  @Column() quyTrinhId: string;
  @Column() loaiDoiTuong: LoaiDoiTuongPheDuyet;
  @Column() doiTuongId: string;
  @Column({ nullable: true }) loaiNghiepVuMa?: string;

  /** 0 cho sự kiện của cả quy trình (gửi duyệt, sửa trọng yếu). */
  @Column({ default: 0 }) thuTu: number;
  @Column({ nullable: true }) viTriTen?: string;

  @Column({ nullable: true }) nguoiXuLyId?: string;
  @Column({ nullable: true }) nguoiXuLyTen?: string;

  @Column({ nullable: true }) batDauCho?: Date;
  @Column({ nullable: true }) thoiDiemXuLy?: Date;

  @Column() ketQua: KetQuaXuLy;
  @Column({ nullable: true }) yKien?: string;
  @Column({ default: 1 }) phienBan: number;

  /** Chốt sẵn = thoiDiemXuLy - batDauCho, đơn vị giây. */
  @Column({ nullable: true }) thoiGianXuLyGiay?: number;
}

export interface LichSuPheDuyetEntities {
  LichSuPheDuyet: typeof LichSuPheDuyet;
}
declare module '../entities' {
  interface Entities extends LichSuPheDuyetEntities {}
}
