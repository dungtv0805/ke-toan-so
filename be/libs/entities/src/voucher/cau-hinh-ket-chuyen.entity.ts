import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Cấu hình kết chuyển của một công ty. Mỗi tenant tối đa 1 bản ghi.
 *
 * Chỉ giữ MÃ loại giao dịch, không giữ id: danh mục Loại giao dịch có thể được clone
 * sang tenant khác (id đổi, mã giữ) — cùng quy ước "gom nhóm theo mã" như phần còn lại
 * của hệ thống.
 */
@Entity('cau_hinh_ket_chuyen')
export class CauHinhKetChuyen extends BaseEntity {
  /** Mã Loại giao dịch dùng cho bút toán kết chuyển. Rỗng = chưa cấu hình. */
  @Column({ nullable: true })
  loaiGiaoDichMa: string;
}

export interface CauHinhKetChuyenEntities {
  CauHinhKetChuyen: typeof CauHinhKetChuyen;
}

declare module '../entities' {
  interface Entities extends CauHinhKetChuyenEntities {}
}
