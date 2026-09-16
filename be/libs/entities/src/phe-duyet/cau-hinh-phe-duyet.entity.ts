import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { LoaiDoiTuongPheDuyet } from './trang-thai';

/**
 * Một cột của ma trận mục 4. `viTriTen` là TÊN vai trò của công ty
 * (`vai_tro.ten`), không phải mã cứng — mục 2: "không hard-code tên chức danh".
 * Đổi tên vai trò thì cấu hình phải đổi theo, `VaiTro_Service.update` lo việc đó.
 */
export interface BuocCauHinh {
  /** 1, 2, 3... Ô trống trên ma trận = không có dòng nào ở đây. */
  thuTu: number;
  viTriTen: string;
  /** Mặc định true. Bước không bắt buộc không chặn chuyển sang Chính thức. */
  batBuoc: boolean;
}

/**
 * Thiết lập phê duyệt của MỘT loại nghiệp vụ — mục 4.
 *
 * Tài liệu nói rõ: "giao diện có thể là ma trận cột, nhưng database nên lưu
 * từng bước workflow, không tạo cột vật lý cố định cho từng vị trí" → `buoc`
 * là mảng, mỗi công ty có số cấp khác nhau tuỳ ý.
 */
@Entity('cau_hinh_phe_duyet')
@Index('IDX_cau_hinh_phe_duyet', ['tenantId', 'loaiDoiTuong', 'loaiNghiepVuMa'])
export class CauHinhPheDuyet extends BaseEntity {
  @Column() loaiDoiTuong: LoaiDoiTuongPheDuyet;

  /** Mã loại nghiệp vụ — với chứng từ là `loai_giao_dich.ma`. */
  @Column() loaiNghiepVuMa: string;

  @Column({ nullable: true }) loaiNghiepVuTen?: string;

  @Column({ type: 'json', default: [] }) buoc: BuocCauHinh[];

  @Column({ default: true }) isActive: boolean;
}

export interface CauHinhPheDuyetEntities {
  CauHinhPheDuyet: typeof CauHinhPheDuyet;
}
declare module '../entities' {
  interface Entities extends CauHinhPheDuyetEntities {}
}
