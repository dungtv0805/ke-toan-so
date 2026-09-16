import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type {
  LoaiDoiTuongPheDuyet,
  TrangThaiBuoc,
  TrangThaiPheDuyet,
} from './trang-thai';

/**
 * Một bước duyệt đang chạy. Mục 9 đòi CẢ HAI mốc: lúc nghiệp vụ được chuyển
 * đến bước (`batDauCho`) và lúc người ta xử lý xong (`thoiDiemXuLy`) — thiếu
 * mốc đầu thì không đo được thời gian chờ, chỉ đo được thời gian từ lúc lập.
 */
export interface BuocPheDuyet {
  thuTu: number;
  viTriTen: string;
  batBuoc: boolean;
  trangThai: TrangThaiBuoc;
  /** Datetime đến giây — mục 9. */
  batDauCho?: Date;
  thoiDiemXuLy?: Date;
  nguoiXuLyId?: string;
  nguoiXuLyTen?: string;
  yKien?: string;
  /** Phiên bản nghiệp vụ mà bước này đã duyệt — mục 11 và 14. */
  phienBan?: number;
  /** Chốt sẵn để báo cáo mục 15 khỏi trừ ngày giờ lại từ đầu. */
  thoiGianXuLyGiay?: number;
}

/**
 * Hồ sơ/chứng từ kèm theo — mục 8. Hai hình thức: file tải lên, hoặc liên kết
 * nội bộ tới chứng từ đã tạo trên hệ thống (`doiTuongIdLienKet`).
 */
export interface HoSoPheDuyet {
  ten: string;
  loai?: string;
  so?: string;
  ngayChungTu?: Date;
  /** 'TAI_LEN' hoặc 'LIEN_KET_NOI_BO'. */
  nguon: 'TAI_LEN' | 'LIEN_KET_NOI_BO';
  fileUrl?: string;
  fileTen?: string;
  doiTuongIdLienKet?: string;
  nguoiGanId?: string;
  nguoiGanTen?: string;
  thoiDiemGan?: Date;
}

/**
 * Một nghiệp vụ đang đi qua luồng phê duyệt.
 *
 * Tách khỏi bảng nghiệp vụ gốc (`chung_tu`) để engine dùng lại được cho phiếu
 * kho, đề xuất mua, hợp đồng... mà không phải đụng vào từng bảng — mục 17.
 * Bảng gốc chỉ giữ một cột `trangThaiPheDuyet` đã denormalize, phục vụ lọc
 * báo cáo cho nhanh.
 */
@Entity('quy_trinh_phe_duyet')
@Index('IDX_quy_trinh_doi_tuong', ['tenantId', 'loaiDoiTuong', 'doiTuongId'])
@Index('IDX_quy_trinh_trang_thai', ['tenantId', 'trangThai'])
export class QuyTrinhPheDuyet extends BaseEntity {
  @Column() loaiDoiTuong: LoaiDoiTuongPheDuyet;

  /** ID bản ghi nghiệp vụ gốc. */
  @Column() doiTuongId: string;

  @Column() loaiNghiepVuMa: string;
  @Column({ nullable: true }) loaiNghiepVuTen?: string;

  // Chụp lại thông tin để màn "Chờ tôi duyệt" (mục 6) không phải gọi chéo
  // service cho từng dòng.
  @Column({ nullable: true }) soPhieu?: string;
  @Column({ nullable: true }) noiDung?: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) soTien: number;
  @Column({ nullable: true }) ngayNghiepVu?: Date;
  @Column({ nullable: true }) nguoiLapId?: string;
  @Column({ nullable: true }) nguoiLapTen?: string;
  @Column({ nullable: true }) boPhan?: string;

  @Column({ default: 'NHAP' }) trangThai: TrangThaiPheDuyet;

  /** `thuTu` của bước đang chờ. 0 khi chưa gửi duyệt hoặc đã xong. */
  @Column({ default: 0 }) buocHienTai: number;

  /** Tăng mỗi lần nội dung trọng yếu bị sửa — mục 11. */
  @Column({ default: 1 }) phienBan: number;

  /** Mốc gốc để tính tổng thời gian phê duyệt — mục 9. */
  @Column({ nullable: true }) ngayGuiDuyet?: Date;
  @Column({ nullable: true }) ngayHoanThanh?: Date;

  @Column({ type: 'json', default: [] }) buoc: BuocPheDuyet[];
  @Column({ type: 'json', default: [] }) hoSo: HoSoPheDuyet[];

  @Column({ default: true }) isActive: boolean;
}

export interface QuyTrinhPheDuyetEntities {
  QuyTrinhPheDuyet: typeof QuyTrinhPheDuyet;
}
declare module '../entities' {
  interface Entities extends QuyTrinhPheDuyetEntities {}
}
