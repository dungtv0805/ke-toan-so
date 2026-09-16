import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Loại thông báo — mục 13 liệt kê đúng bốn tình huống cần bắn. */
export type LoaiThongBao =
  | 'DEN_LUOT_DUYET'
  | 'BI_TRA_LAI'
  | 'BI_TU_CHOI'
  | 'HOAN_THANH';

/**
 * Thông báo trong ứng dụng — mục 13.
 *
 * Mỗi dòng gửi cho ĐÚNG MỘT người. Bước duyệt có nhiều người giữ vị trí thì
 * sinh nhiều dòng — mục 13 đòi "gửi cho đúng người đang đảm nhiệm vị trí đó",
 * và tuyệt đối không gửi cho cấp chưa đến lượt.
 */
@Entity('thong_bao')
@Index('IDX_thong_bao_nguoi_nhan', ['tenantId', 'userId', 'daDoc'])
export class ThongBao extends BaseEntity {
  @Column() userId: string;
  @Column() loai: LoaiThongBao;
  @Column() tieuDe: string;
  @Column({ nullable: true }) noiDung?: string;

  /** Đường dẫn FE dẫn thẳng tới nghiệp vụ — mục 13. */
  @Column({ nullable: true }) duongDan?: string;

  @Column({ nullable: true }) quyTrinhId?: string;
  @Column({ default: false }) daDoc: boolean;
  @Column({ nullable: true }) ngayDoc?: Date;
}

export interface ThongBaoEntities {
  ThongBao: typeof ThongBao;
}
declare module '../entities' {
  interface Entities extends ThongBaoEntities {}
}
